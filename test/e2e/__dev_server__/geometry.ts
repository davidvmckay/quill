import Quill from '../../../src/quill.js';
import Delta from '../../../src/delta/Delta.js';
import Selection, { Range } from '../../../src/core/selection.js';
import { createRegistry, createScroll } from '../../unit/__helpers__/factory.js';
import Bold from '../../../src/formats/bold.js';
import Underline from '../../../src/formats/underline.js';
import Image from '../../../src/formats/image.js';
import Link from '../../../src/formats/link.js';
import Italic from '../../../src/formats/italic.js';
import Strike from '../../../src/formats/strike.js';
import { ColorStyle } from '../../../src/formats/color.js';
import { BackgroundStyle } from '../../../src/formats/background.js';
import { SizeClass } from '../../../src/formats/size.js';
import { normalizeHTML } from '../../unit/__helpers__/utils.js';

type Check = { matcher: string; actual: unknown; expected: unknown; tolerance?: number };
let checks: Check[] = [];
const names: string[] = [];
const cases: { name: string; run: () => unknown }[] = [];
const describe = (name: string, callback: () => void) => { names.push(name); callback(); names.pop(); };
const test = (name: string, run: () => unknown) => cases.push({ name: [...names, name].join(' > '), run });
// Browser code records observations; bun:test performs the assertions in its runtime.
const expect = (actual: unknown) => ({
  approximately: (expected: number, tolerance: number) => checks.push({ matcher: 'approximately', actual, expected, tolerance }),
  toBe: (expected: unknown) => checks.push({ matcher: 'toBe', actual, expected }),
  toEqual: (expected: unknown) => checks.push({ matcher: 'toEqual', actual, expected }),
  toBeGreaterThan: (expected: number) => checks.push({ matcher: 'toBeGreaterThan', actual, expected }),
  not: { toThrow() { let error: unknown; try { (actual as () => void)(); } catch (caught) { error = String(caught); } checks.push({ matcher:'toBe', actual:error, expected:undefined }); } },
});
const vi = { async waitFor(callback: () => Promise<void>) {
  const start=checks.length; const deadline=performance.now()+4000;
  while(true) {
    checks.length=start; await callback();
    if(checks.slice(start).every(check=>check.matcher==='toBeGreaterThan' ? Number(check.actual)>Number(check.expected) : check.actual===check.expected) || performance.now()>deadline) return;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
} };
const createContainer = (html: string | {html:string} = '') => {
  const container=document.body.appendChild(document.createElement('div'));
  container.innerHTML=normalizeHTML(html); return container;
};
const createSelection = (html: string, container=document.body) => {
  const scroll=createScroll(html,createRegistry([Bold,Underline,Italic,Strike,Image,Link,ColorStyle,BackgroundStyle,SizeClass]),container);
  return new Selection(scroll,scroll.emitter);
};

describe('getBounds()', () => {
    const setup = () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      container.classList.add('ql-editor');
      const style = document.body.appendChild(document.createElement('style'));
      style.innerText =
        '.ql-editor p, .ql-editor img { margin: 0; padding: 0; border: 0; }';
      container.style.fontFamily = 'monospace';
      container.style.lineHeight = '18px';
      const div = container.appendChild(document.createElement('div'));
      div.style.border = '1px solid #777';
      div.innerHTML = '<p><span>0</span></p>';
      const span = div.firstChild?.firstChild as HTMLSpanElement;
      // Compare text selection geometry with text metrics, not the inline box.
      const sample = document.createRange();
      sample.selectNodeContents(span);
      const bounds = sample.getBoundingClientRect();
      const reference = {
        height: bounds.height,
        left: bounds.left,
        lineHeight: span.parentElement?.offsetHeight as number,
        width: bounds.width,
        top: bounds.top,
      };
      div.remove();

      return { reference, container };
    };

    test('empty document', () => {
      const { reference, container } = setup();
      const selection = createSelection('<p><br></p>', container);
      const bounds = selection.getBounds(0);
      expect(bounds?.left).approximately(reference.left, 3);
      expect(bounds?.height).approximately(reference.height, 3);
      expect(bounds?.top).approximately(reference.top, 3);
    });

    test('empty line', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        `
        <p>0000</p>
        <p><br></p>
        <p>0000</p>`,
        container,
      );
      const bounds = selection.getBounds(5);
      expect(bounds?.left).approximately(reference.left, 3);
      expect(bounds?.height).approximately(reference.height, 3);
      expect(bounds?.top).approximately(
        reference.top + reference.lineHeight,
        3,
      );
    });

    test('plain text', () => {
      const { reference, container } = setup();
      const selection = createSelection('<p>0123</p>', container);
      const bounds = selection.getBounds(2);
      expect(bounds?.left).approximately(
        reference.left + reference.width * 2,
        2,
      );
      expect(bounds?.height).approximately(reference.height, 1);
      expect(bounds?.top).approximately(reference.top, 1);
    });

    test('multiple characters', () => {
      const { reference, container } = setup();
      const selection = createSelection('<p>0123</p>', container);
      const bounds = selection.getBounds(1, 2);
      expect(bounds?.left).approximately(reference.left + reference.width, 2);
      expect(bounds?.height).approximately(reference.height, 1);
      expect(bounds?.top).approximately(reference.top, 1);
      expect(bounds?.width).approximately(reference.width * 2, 2);
    });

    test('start of line', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        `
        <p>0000</p>
        <p>0000</p>`,
        container,
      );
      const bounds = selection.getBounds(5);
      expect(bounds?.left).approximately(reference.left, 1);
      expect(bounds?.height).approximately(reference.height, 1);
      expect(bounds?.top).approximately(
        reference.top + reference.lineHeight,
        1,
      );
    });

    test('end of line', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        `
        <p>0000</p>
        <p>0000</p>
        <p>0000</p>`,
        container,
      );
      const bounds = selection.getBounds(9);
      expect(bounds?.left).approximately(
        reference.left + reference.width * 4,
        4,
      );
      expect(bounds?.height).approximately(reference.height, 1);
      expect(bounds?.top).approximately(
        reference.top + reference.lineHeight,
        1,
      );
    });

    test('selection starting at end of text node', () => {
      const { reference, container } = setup();
      container.style.width = `${reference.width * 4}px`;
      const selection = createSelection(
        `
        <p>
          0000
          <b>0000</b>
          0000
        </p>`,
        container,
      );
      const bounds = selection.getBounds(4, 1);
      expect(bounds?.width).approximately(reference.width, 1);
    });

    test('multiple lines', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        `
        <p>0000</p>
        <p>0000</p>
        <p>0000</p>`,
        container,
      );
      const bounds = selection.getBounds(2, 4);
      expect(bounds?.left).approximately(reference.left, 1);
      expect(bounds?.height).approximately(reference.height * 2, 3);
      expect(bounds?.top).approximately(reference.top, 1);
      expect(bounds?.width).toBeGreaterThan(3 * reference.width);
    });

    test('large text', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        '<p><span class="ql-size-large">0000</span></p>',
        container,
      );
      const span = container.querySelector('span') as HTMLSpanElement;
      const bounds = selection.getBounds(2);
      expect(bounds?.left).approximately(
        reference.left + span.offsetWidth / 2,
        3,
      );
      expect(bounds?.height).approximately(span.offsetHeight, 3);
      expect(bounds?.top).approximately(reference.top, 3);
    });

    test('image', () => {
      const { reference, container } = setup();
      const selection = createSelection(
        `
        <p>
          <img src="/assets/favicon.png" width="32px" height="32px">
          <img src="/assets/favicon.png" width="32px" height="32px">
        </p>`,
        container,
      );
      const bounds = selection.getBounds(1);
      expect(bounds?.left).approximately(reference.left + 32, 1);
      expect(bounds?.height).approximately(32, 1);
      expect(bounds?.top).approximately(reference.top, 3);
    });

    test('beyond document', () => {
      const selection = createSelection('<p>0123</p>');
      expect(() => {
        selection.getBounds(10, 0);
      }).not.toThrow();
      expect(() => {
        selection.getBounds(0, 10);
      }).not.toThrow();
    });
  });
describe('scrollSelectionIntoView', () => {
    const createContents = (separator: string) =>
      new Array(200)
        .fill(0)
        .map((_, i) => `text ${i + 1}`)
        .join(separator);

    const viewportRatio = (element: Element): Promise<number> => {
      return new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          resolve(entries[0].intersectionRatio);
          observer.disconnect();
        });
        observer.observe(element);
        // Firefox doesn't call IntersectionObserver callback unless
        // there are rafs.
        requestAnimationFrame(() => {});
      });
    };

    test('scroll upward', async () => {
      document.body.style.height = '500px';
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        height: '100px',
        overflow: 'scroll',
      });

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        height: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.height = '800px';

      const quill = new Quill(editorContainer);

      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');

      container.scrollTop = -500;

      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(10)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toEqual(0);
    });

    test('scroll downward', async () => {
      document.body.style.height = '500px';
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        height: '100px',
        overflow: 'scroll',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.height = '80px';

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        height: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const quill = new Quill(editorContainer);

      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection(
        { index: text.indexOf('text 100'), length: 4 },
        'user',
      );

      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(100)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(101)') as HTMLElement,
        ),
      ).toEqual(0);
    });

    test('scroll-padding', async () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      const quill = new Quill(container);
      Object.assign(quill.root.style, {
        scrollPaddingBottom: '50px',
        height: '200px',
        overflow: 'auto',
      });
      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(10)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      quill.root.style.scrollPaddingBottom = '0';
      quill.setSelection(1, 'user');
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toBe(0);
    });

    test('inline scroll', async () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        width: '200px',
        display: 'flex',
        overflow: 'scroll',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.width = '80px';

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        width: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const quill = new Quill(editorContainer);

      Object.assign(quill.root.style, {
        overflow: 'scroll',
        whiteSpace: 'nowrap',
      });

      const text = createContents(' ');
      const text100Index = text.indexOf('text 100');
      const delta = new Delta()
        .insert(text)
        .compose(new Delta().retain(text100Index).retain(8, { bold: true }));
      quill.setContents(delta);
      quill.setSelection({ index: text100Index, length: 8 }, 'user');

      expect(
        await viewportRatio(
          editorContainer.querySelector('strong') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);

      quill.setSelection(0, 'user');
      expect(
        await viewportRatio(
          editorContainer.querySelector('strong') as HTMLElement,
        ),
      ).toEqual(0);
    });

    test('scroll smoothly', async () => {
      document.body.style.height = '500px';
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        height: '100px',
        overflow: 'scroll',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.height = '80px';

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        height: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const quill = new Quill(editorContainer);

      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection(
        { index: text.indexOf('text 100'), length: 4 },
        'silent',
      );
      quill.scrollSelectionIntoView({ smooth: true });

      await vi.waitFor(async () => {
        expect(
          await viewportRatio(
            editorContainer.querySelector('p:nth-child(100)') as HTMLElement,
          ),
        ).toBeGreaterThan(0.9);
        expect(
          await viewportRatio(
            editorContainer.querySelector('p:nth-child(101)') as HTMLElement,
          ),
        ).toEqual(0);
      });
    });
  });
for(const [name,range] of [['index',1],['range',new Range(3,4)]] as const) {
  test('getBounds() API '+name,()=>{const quill=new Quill(createContainer('<p>0123<em>45</em>67</p>')); checks.push({matcher:'toBe',actual:!!quill.getBounds(range as any),expected:true});});
}
// @ts-expect-error The browser test driver loads this fixture explicitly.
window.Geometry=cases.map(({name,run})=>({name,async run(){
  document.querySelectorAll('link[rel=stylesheet]').forEach(node=>node.remove());
  document.body.innerHTML=''; document.body.style.cssText='font-family: Arial, sans-serif; font-size: 16px;'; checks=[];
  await run(); return checks;
}}));
