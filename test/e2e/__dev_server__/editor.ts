import type Quill from '../../../src/quill.js';

const browser: Window & { Quill?: typeof Quill; quill?: Quill } = window;
const Editor = browser.Quill;
if (!Editor) throw new Error('The browser fixture needs the Quill bundle');
const element = document.getElementById('editor');
if (!element) throw new Error('The browser fixture needs an editor element');
browser.quill = new Editor(element, {
  modules: { syntax: true, toolbar: '#toolbar-container' },
  placeholder: 'Compose an epic...',
  theme: 'snow',
});
