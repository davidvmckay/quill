import { test as bunTest, describe, beforeEach, afterEach } from 'bun:test';
import EditorPage from '../pageobjects/EditorPage.js';
import Composition from './Composition.js';
import Clipboard from './Clipboard.js';
import { createPage, browserName, baseURL } from '../../browser/page.js';

interface Fixtures {
  page: Awaited<ReturnType<typeof createPage>>;
  editorPage: EditorPage;
  composition: Composition;
  clipboard: Clipboard;
  request: { get(path: string): Promise<{ ok(): boolean; text(): Promise<string> }> };
}
let current: Fixtures;
beforeEach(async () => {
  const page = await createPage();
  current = {
    page,
    editorPage: new EditorPage(page),
    composition: new Composition(page, browserName),
    clipboard: new Clipboard(page),
    request: { async get(path) {
      const response = await fetch(new URL(path, baseURL));
      return { ok: () => response.ok, text: () => response.text() };
    } },
  };
});
afterEach(async () => { await current?.page.close(); });

type TestBody = (fixtures: Fixtures) => Promise<void>;
const registerTest = (name: string, callback: TestBody, supported = true) => {
  const register = supported ? bunTest : bunTest.skip;
  register(name, () => callback(current), 30000);
};

// Bun owns test registration and lifecycle; the browser driver supplies fixtures.
export const test = Object.assign(
  (name: string, callback: TestBody) => registerTest(name, callback),
  {
    describe,
    ime: (name: string, callback: TestBody) => registerTest(name, callback, browserName === 'chromium'),
    // Bun's WKWebView backend has no native clipboard paste operation.
    clipboard: (name: string, callback: TestBody) => registerTest(name, callback, browserName !== 'webkit'),
    beforeEach: (callback: (fixtures: Fixtures) => Promise<void>) => beforeEach(() => callback(current)),
  },
);

export const CHAPTER = 'Chapter 1. Loomings.';
export const P1 =
  'Call me Ishmael. Some years ago—never mind how long precisely-having little or no money in my purse, and nothing particular to interest me on shore.';
export const P2 =
  'There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs—commerce surrounds it with her surf.';
