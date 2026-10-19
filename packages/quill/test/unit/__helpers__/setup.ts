import { JSDOM } from 'jsdom';
import { plugin } from 'bun';
import { beforeEach, afterEach, spyOn, mock } from 'bun:test';

const { window } = new JSDOM('', { url: 'http://localhost/', pretendToBeVisual: true });
for (const name of Object.getOwnPropertyNames(window)) {
  if (!(name in globalThis) && /^[A-Z]/.test(name)) {
    Object.defineProperty(globalThis, name, { configurable: true, value: (window as any)[name] });
  }
}
for (const name of ['window', 'document', 'navigator', 'Event', 'EventTarget', 'MouseEvent', 'KeyboardEvent', 'CompositionEvent', 'InputEvent', 'FocusEvent', 'File', 'Blob', 'FileReader', 'getComputedStyle', 'getSelection']) {
  const value = (window as any)[name];
  Object.defineProperty(globalThis, name, { configurable: true, value: typeof value === 'function' && name.startsWith('get') ? value.bind(window) : value });
}
// Code blocks contain text/inline tokens; jsdom lacks their browser innerText getter.
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
  configurable: true,
  get() { return this.textContent; },
  set(value: string) { this.textContent = value; },
});
plugin({ name: 'quill-test-svg', setup(build) {
  build.onLoad({ filter: /\.svg$/ }, async ({ path }) => ({
    contents: `export default ${JSON.stringify(await Bun.file(path).text())};`, loader: 'js',
  }));
} });
await import('./expect.js');
const { default: Quill } = await import('../../../src/core/quill.js');
beforeEach(() => {
  document.body.innerHTML = '';
  // Unit tests exercise document operations. Real scrolling is checked in browsers.
  spyOn(Quill.prototype, 'scrollSelectionIntoView').mockImplementation(() => {});
});
afterEach(() => { mock.restore(); document.getSelection()?.removeAllRanges(); });
