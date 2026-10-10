import Delta from 'quill-delta';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Quill from '../../../src/core.js';
import Formula from '../../../src/formats/formula.js';
import Video from '../../../src/formats/video.js';
import { createRegistry } from '../__helpers__/factory.js';

const createQuill = () => {
  const container = document.body.appendChild(document.createElement('div'));
  return new Quill(container, {
    registry: createRegistry([Formula, Video]),
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
