import { expectElement } from '../browser/assert.js';
import { expect } from 'bun:test';
import { test } from './fixtures/index.js';

for (const theme of ['core', 'snow', 'bubble']) {
  test(`${theme} stylesheet preserves editor lists and RTL indentation`, async ({
    page,
    request,
  }) => {
    const stylesheet = await request.get(`/quill.${theme}.css`);
    expect(stylesheet.ok()).toBe(true);
    const css = await stylesheet.text();
    expect(css).toContain('Licensed under BSD-3-Clause');
    expect(css).not.toContain('@import');

    await page.goto('/');
    await page.setContent(`
      <link rel="stylesheet" href="/quill.${theme}.css">
      <div class="ql-container ql-${theme}">
        <div class="ql-editor">
          <ol>${Array.from(
            { length: 10 },
            (_, level) =>
              `<li data-list="ordered" class="ql-indent-${level}"><span class="ql-ui"></span>Level ${level}</li>`,
          ).join('')}</ol>
          <ol><li id="rtl" data-list="ordered" class="ql-indent-9 ql-direction-rtl ql-align-right"><span class="ql-ui"></span>RTL</li></ol>
        </div>
      </div>
    `);
    const layout = await page.evaluate(() => {
      const editor = document.querySelector('.ql-editor')!;
      return {
        whitespace: getComputedStyle(editor).whiteSpace,
        counters: [...document.querySelectorAll('.ql-ui')]
          .slice(0, 10)
          .map((ui) => getComputedStyle(ui, '::before').content),
        padding: [...document.querySelectorAll('li')]
          .slice(0, 10)
          .map((item) => parseFloat(getComputedStyle(item).paddingLeft)),
        rtl: {
          direction: getComputedStyle(document.querySelector('#rtl')!)
            .direction,
          padding: parseFloat(
            getComputedStyle(document.querySelector('#rtl')!).paddingRight,
          ),
        },
      };
    });
    expect(layout.whitespace).toBe('pre-wrap');
    layout.counters.forEach((content, level) => {
      // Decimal is the default and may be omitted by CSS serialization.
      const counterStyle = ['', ', lower-alpha', ', lower-roman'][level % 3];
      expect(content.replace(', decimal)', ')')).toContain(
        `counter(list-${level}${counterStyle})`,
      );
      expect(layout.padding[level]).toBeCloseTo((3 * level + 1.5) * 13);
    });
    expect(layout.rtl.direction).toBe('rtl');
    expect(layout.rtl.padding).toBeCloseTo(28.5 * 13);
  });
}

for (const theme of ['snow', 'bubble']) {
  test(`${theme} stylesheet preserves picker colors and keyboard focus`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.setContent(`
      <link rel="stylesheet" href="/quill.${theme}.css">
      <div class="ql-toolbar ql-${theme}">
        <span class="ql-picker ql-expanded">
          <span class="ql-picker-label" tabindex="0">Font</span>
          <span class="ql-picker-options">
            <span class="ql-picker-item ql-selected" tabindex="0">Serif</span>
          </span>
        </span>
      </div>
    `);
    await page.keyboard.press('Tab');
    const label = page.locator('.ql-picker-label');
    await expectElement(label).toBeFocused();
    const activeColor =
      theme === 'snow' ? 'rgb(0, 102, 204)' : 'rgb(255, 255, 255)';
    await expectElement(label).toHaveCSS('outline-color', activeColor);
    await expectElement(label).toHaveCSS('outline-width', '2px');
    const options = page.locator('.ql-picker-options');
    await expectElement(options).toBeVisible();
    await expectElement(options).toHaveCSS(
      'background-color',
      theme === 'snow' ? 'rgb(255, 255, 255)' : 'rgb(68, 68, 68)',
    );
    const item = page.locator('.ql-picker-item');
    await expectElement(item).toHaveCSS('color', activeColor);
    await page.keyboard.press('Tab');
    await expectElement(item).toBeFocused();
    await expectElement(item).toHaveCSS('outline-offset', '-2px');
  });
}
