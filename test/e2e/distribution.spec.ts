import { expect } from 'bun:test';
import { test } from './fixtures/index.js';
import pkg from '../../package.json';

test('compiled browser bundle keeps exported payloads inert', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  const result = await page.evaluate(() => {
    // @ts-expect-error Test the browser distribution's global API.
    const quill = window.quill;
    // @ts-expect-error KaTeX is only needed to create a formula; export uses its value.
    window.katex = {
      render(value: string, element: Element) {
        element.textContent = value;
      },
    };
    const values = [
      { formula: '</span><img src=x onerror=alert(1)>' },
      { video: 'https://example.com" onmouseover="alert(1)' },
    ];
    return values.map((insert) => {
      quill.setContents([{ insert }]);
      const template = document.createElement('template');
      template.innerHTML = quill.getSemanticHTML();
      const element = template.content.querySelector('span, a')!;
      return {
        text: element.textContent,
        href: element.getAttribute('href'),
        unsafe: template.content.querySelectorAll(
          'img, script, svg, [onmouseover], [onerror]',
        ).length,
      };
    });
  });
  expect(result).toEqual([
    { text: '</span><img src=x onerror=alert(1)>', href: null, unsafe: 0 },
    {
      text: 'https://example.com" onmouseover="alert(1)',
      href: 'https://example.com" onmouseover="alert(1)',
      unsafe: 0,
    },
  ]);
});

test('compiled modules preserve deep imports and class identity', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  await page.addScriptTag({ url: '/modules.js' });
  const result = await page.evaluate(() => {
    // @ts-expect-error Populated by the module consumer fixture.
    const { Quill, Bold, Parchment, Delta } = window.QuillModules;
    const container = document.body.appendChild(document.createElement('div'));
    const quill = new Quill(container);
    quill.setText('Bun modules');
    quill.formatText(0, 11, 'bold', true);
    return {
      html: quill.getSemanticHTML(),
      sameClass: Quill.import('formats/bold') === Bold,
      sameRegistry: Quill.import('parchment').Registry === Parchment.Registry,
      sameInlineBlot: quill.scroll.find(quill.root.querySelector('strong')) instanceof Parchment.InlineBlot,
      sameDelta: quill.getContents() instanceof Delta,
      version: Quill.version,
    };
  });
  expect(result.html).toBe('<p><strong>Bun modules</strong></p>');
  expect(result.sameClass).toBe(true);
  expect(result.sameRegistry).toBe(true);
  expect(result.sameInlineBlot).toBe(true);
  expect(result.sameDelta).toBe(true);
  expect(result.version).toBe(pkg.version);
});

test('compiled modules preserve inherited image, video and table blot state', async ({
  page,
  editorPage,
}) => {
  await editorPage.open();
  await page.addScriptTag({ url: '/modules.js' });
  const result = await page.evaluate(() => {
    // @ts-expect-error Populated by the module consumer fixture.
    const { Quill } = window.QuillModules;
    const container = document.body.appendChild(document.createElement('div'));
    const quill = new Quill(container);
    quill.setContents([
      { insert: { image: 'https://example.com/image.png' } },
      { insert: '\n' },
      { insert: { video: 'https://example.com/video' } },
      { insert: 'cell' },
      { insert: '\n', attributes: { table: 'row-1' } },
    ]);
    return { html: quill.getSemanticHTML(), text: quill.getText() };
  });
  expect(result.html).toContain('<img src="https://example.com/image.png">');
  expect(result.html).toContain(
    '<a href="https://example.com/video">https://example.com/video</a>',
  );
  expect(result.html).toContain('<td data-row="row-1">cell</td>');
  expect(result.text).toContain('cell');
});

test('core browser bundle can construct an editor', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/quill.core.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Core bundle failed to load'));
      document.head.appendChild(script);
    });
    // @ts-expect-error Test the core distribution's global API.
    const quill = new window.Quill(
      document.body.appendChild(document.createElement('div')),
    );
    quill.setText('Core bundle');
    return quill.getSemanticHTML();
  });
  expect(result).toBe('<p>Core bundle</p>');
});
