import { expectElement } from '../browser/assert.js';

import { expect } from 'bun:test';
import { test } from './fixtures/index.js';

test('toolbar pickers support keyboard selection and escape', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  await editorPage.setContents([{ insert: 'Select this text\n' }]);
  await editorPage.setSelection(0, 16);
  const trigger = page.getByRole('button', {
    name: 'font: Default font',
    exact: true,
  });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expectElement(
    page.getByRole('option', { name: 'Default font', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expectElement(
    page.getByRole('option', { name: 'serif', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  const selected = page.getByRole('button', {
    name: 'font: serif',
    exact: true,
  });
  await expectElement(selected).toBeFocused();
  await expectElement(page.locator('select.ql-font')).toHaveValue('serif');
  const format = await page.evaluate(() => {
    // @ts-expect-error Verify that keyboard selection actually formats text.
    return window.quill.getFormat(0, 16).font;
  });
  expect(format).toBe('serif');
  await selected.press(' ');
  await expectElement(
    page.getByRole('option', { name: 'serif', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expectElement(selected).toBeFocused();
  await expectElement(selected).toHaveAttribute('aria-expanded', 'false');
  await selected.press('Tab');
  await expectElement(
    page.getByRole('button', { name: 'size: Normal', exact: true }),
  ).toBeFocused();
});

test('toolbar exposes valid accessible names and selection roles', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  await page
    .getByRole('button', { name: 'font: Default font', exact: true })
    .press('ArrowDown');
  await page.addScriptTag({ url: '/axe.js' });
  const result = await page.evaluate(async () => {
    // @ts-expect-error Loaded by the local accessibility fixture.
    return window.axe.run(document.querySelector('.ql-toolbar'), { runOnly: { type: 'rule', values: [
      'button-name', 'aria-command-name', 'aria-input-field-name', 'aria-required-attr',
      'aria-required-children', 'aria-required-parent', 'aria-valid-attr-value',
      'aria-prohibited-attr', 'aria-valid-attr', 'aria-hidden-focus',
    ] } });
  });
  expect(result.violations).toEqual([]);
});

test('navigate mode lets Tab and Shift+Tab leave the editor', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  await page.evaluate(() => {
    // @ts-expect-error Test the browser distribution's keyboard options.
    const quill = window.quill;
    quill.keyboard.options.tabBehavior = 'navigate';
    const before = document.createElement('button');
    before.textContent = 'Before editor';
    const after = document.createElement('button');
    after.textContent = 'After editor';
    quill.root.before(before);
    quill.root.after(after);
    quill.setText('Tab leaves this content intact');
    quill.setSelection(0);
  });
  const contents = await editorPage.getContents();
  await editorPage.root.press('Tab');
  await expectElement(
    page.getByRole('button', { name: 'After editor', exact: true }),
  ).toBeFocused();
  await editorPage.root.press('Shift+Tab');
  await expectElement(
    page.getByRole('button', { name: 'Before editor', exact: true }),
  ).toBeFocused();
  expect(await editorPage.getContents()).toEqual(contents);
});
