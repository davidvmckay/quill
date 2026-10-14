import Delta from 'quill-delta';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Quill from '../../../src/core.js';
import Formula from '../../../src/formats/formula.js';
import Video from '../../../src/formats/video.js';
import Bold from '../../../src/formats/bold.js';
import Italic from '../../../src/formats/italic.js';
import Link from '../../../src/formats/link.js';
import Indent from '../../../src/formats/indent.js';
import Image from '../../../src/formats/image.js';
import { createRegistry } from '../__helpers__/factory.js';

const createQuill = () => {
  const container = document.body.appendChild(document.createElement('div'));
  return new Quill(container, {
    registry: createRegistry([
      Formula,
      Video,
      Bold,
      Italic,
      Link,
      Indent,
      Image,
    ]),
  });
};

describe.each([
  ['document', (quill: Quill) => quill.getSemanticHTML()],
  ['range', (quill: Quill) => quill.getSemanticHTML({ index: 0, length: 1 })],
  ['editor', (quill: Quill) => quill.editor.getHTML(0, quill.getLength())],
] as const)('HTML export (%s)', (_name, exportHTML) => {
  describe('formula', () => {
    beforeEach(() => {
      vi.stubGlobal('katex', {
        render(value: string, node: Element) {
          node.textContent = value;
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test.each([
      'E = mc^2',
      'a < b & c > d "quoted" \'single\'',
      '</span><img src=x onerror=alert(1)>',
      '<svg onload=alert(1)></svg>',
      '&lt;img src=x onerror=alert(1)&gt;',
    ])('preserves %s as text', (value) => {
      const quill = createQuill();
      quill.setContents(new Delta().insert({ formula: value }));
      const exported = document.createElement('template');
      exported.innerHTML = exportHTML(quill);

      expect(exported.content.querySelectorAll('span')).toHaveLength(1);
      const formula = exported.content.querySelector('span')!;
      expect(formula.textContent).toBe(value);
      expect(formula.children).toHaveLength(0);
      expect(formula.attributes).toHaveLength(0);
      expect(
        exported.content.querySelectorAll('img, svg, script'),
      ).toHaveLength(0);
      expect(quill.getContents().ops[0].insert).toEqual({ formula: value });
    });
  });

  describe('video', () => {
    test.each([
      'https://example.com/video',
      'https://example.com/video?a=1&b=2',
      'https://example.com" onmouseover="alert(1)',
      'https://example.com"><img src=x onerror=alert(1)>',
      'https://example.com/<svg onload=alert(1)>',
      'https://example.com/&quot; onmouseover=&quot;alert(1)',
    ])('preserves %s as a single link', (value) => {
      const quill = createQuill();
      quill.setContents(new Delta().insert({ video: value }));
      const exported = document.createElement('template');
      exported.innerHTML = exportHTML(quill);

      expect(exported.content.querySelectorAll('a')).toHaveLength(1);
      const video = exported.content.querySelector('a')!;
      expect(video.textContent).toBe(value);
      expect(video.getAttribute('href')).toBe(value);
      expect(video.children).toHaveLength(0);
      expect(Array.from(video.attributes, ({ name }) => name)).toEqual([
        'href',
      ]);
      expect(
        exported.content.querySelectorAll('img, svg, script'),
      ).toHaveLength(0);
      expect(quill.getContents().ops[0].insert).toEqual({ video: value });
    });

    test.each([
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ])('sanitizes %s', (value) => {
      const quill = createQuill();
      quill.setContents(new Delta().insert({ video: value }));
      const exported = document.createElement('template');
      exported.innerHTML = exportHTML(quill);

      const video = exported.content.querySelector('a')!;
      expect(video.getAttribute('href')).toBe('about:blank');
      expect(video.textContent).toBe('about:blank');
    });
  });
});

describe('HTML export fidelity', () => {
  test('ordinary spaces stay breakable', () => {
    const quill = createQuill();
    quill.setText('a text with normal spaces');
    expect(quill.getSemanticHTML()).toBe('<p>a text with normal spaces</p>');
    expect(quill.getSemanticHTML(2, 4)).toBe('text');
  });

  test.each([
    'one   two',
    '  leading and trailing  ',
    '\tTabbed\ttext',
    'a\u00a0b',
    'a < b & c > d',
  ])('round-trips whitespace in %s', (text) => {
    const quill = createQuill();
    quill.setText(text);
    const html = quill.getSemanticHTML();
    const parsed = document.createElement('template');
    parsed.innerHTML = html;
    expect(parsed.content.textContent).toBe(text);
    const copy = createQuill();
    copy.setContents(copy.clipboard.convert({ html }));
    expect(copy.getContents()).toEqual(quill.getContents());
  });

  test('round-trips whitespace across formatting boundaries', () => {
    const quill = createQuill();
    quill.setContents(
      new Delta()
        .insert('bold ', { bold: true })
        .insert(' italic', { italic: true })
        .insert('\n'),
    );
    const copy = createQuill();
    copy.setContents(copy.clipboard.convert({ html: quill.getSemanticHTML() }));
    expect(copy.getContents()).toEqual(quill.getContents());
  });

  test('round-trips nested lists and escaped link URLs', () => {
    const quill = createQuill();
    quill.setContents(
      new Delta()
        .insert('Parent', { link: 'https://example.com/?a=1&b=2' })
        .insert('\n', { list: 'ordered' })
        .insert('  Nested item', { bold: true })
        .insert('\n', { list: 'bullet', indent: 1 }),
    );
    const html = quill.getSemanticHTML();
    const copy = createQuill();
    copy.setContents(copy.clipboard.convert({ html }));
    expect(copy.getContents()).toEqual(quill.getContents());
  });

  test('round-trips image embeds', () => {
    const quill = createQuill();
    quill.setContents(
      new Delta()
        .insert('image ')
        .insert({ image: 'https://example.com/image.png?a=1&b=2' })
        .insert('\n'),
    );
    const copy = createQuill();
    copy.setContents(copy.clipboard.convert({ html: quill.getSemanticHTML() }));
    expect(copy.getContents()).toEqual(quill.getContents());
  });
});
