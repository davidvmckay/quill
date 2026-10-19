import { firefox } from 'playwright';
import type { Browser, Page as FirefoxPage } from 'playwright';

export type BrowserName = 'chromium' | 'firefox' | 'webkit';
export const browserName = (Bun.env.BROWSER || 'chromium') as BrowserName;
export const baseURL = 'http://127.0.0.1:9001';
let firefoxBrowser: Browser | undefined;

export async function closeBrowsers() {
  await firefoxBrowser?.close();
  firefoxBrowser = undefined;
  Bun.WebView.closeAll();
}

export async function createPage() {
  if (browserName === 'firefox') {
    firefoxBrowser ??= await firefox.launch();
    return new Page(await firefoxBrowser.newPage({ viewport: { width: 1280, height: 720 } }));
  }
  if (browserName !== 'chromium' && browserName !== 'webkit') throw new Error(`Unsupported BROWSER: ${browserName}`);
  return new Page(new Bun.WebView({
    width: 1280,
    height: 720,
    backend: browserName === 'webkit' ? 'webkit' : { type: 'chrome', url: false },
  }));
}

export async function waitFor(check: () => Promise<unknown>, timeout = 10000) {
  const deadline = performance.now() + timeout;
  do {
    if (await check()) return;
    await Bun.sleep(20);
  } while (performance.now() < deadline);
  throw new Error(`Browser condition did not become true within ${timeout}ms`);
}

export class Page {
  private pending: Promise<unknown> = Promise.resolve();
  private held = new Set<Bun.WebView.Modifier>();
  constructor(private backend: Bun.WebView | FirefoxPage) {}
  private get view() { return this.backend instanceof Bun.WebView ? this.backend : undefined; }
  private get firefox() { return this.view ? undefined : this.backend as FirefoxPage; }
  private run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation);
    this.pending = next.catch(() => {});
    return next;
  }
  private expression<T>(script: string): Promise<T> {
    return this.run(() => this.view ? this.view.evaluate<T>(script) : this.firefox!.evaluate(script));
  }
  evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  evaluate<R, A>(fn: ((arg: A) => R | Promise<R>) | string, arg?: A): Promise<R> {
    return this.expression(typeof fn === 'string' ? fn : `(${fn.toString()})(${JSON.stringify(arg) ?? 'undefined'})`);
  }
  async goto(path: string) {
    const url = new URL(path, baseURL).href;
    await this.run(() => this.view ? this.view.navigate(url) : this.firefox!.goto(url).then(() => {}));
    if (this.view && browserName === 'chromium') {
      await this.run(() => this.view!.cdp('Emulation.setFocusEmulationEnabled', { enabled: true }));
      await this.run(() => this.view!.cdp('Page.bringToFront'));
      await this.run(() => this.view!.cdp('Browser.grantPermissions', {
        origin: baseURL, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
      }));
    }
  }
  async setContent(html: string) {
    await this.expression(`(() => { document.open(); document.write(${JSON.stringify(html)}); document.close(); })()`);
    await this.waitForFunction(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')].every(link => !!link.sheet));
  }
  async addScriptTag({ url }: { url: string }) {
    await this.expression(`new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = ${JSON.stringify(new URL(url, baseURL).href)}; script.onload = () => resolve(true); script.onerror = () => reject(new Error('Script load failed')); document.head.append(script); })`);
  }
  waitForFunction<A>(fn: (arg: A) => unknown, arg?: A) {
    return waitFor(() => this.expression(`Boolean((${fn.toString()})(${JSON.stringify(arg) ?? 'undefined'}))`));
  }
  waitForSelector(selector: string, { timeout = 10000 } = {}) {
    return waitFor(() => this.evaluate(selector => !!document.querySelector(selector), selector), timeout);
  }
  locator(selector: string) { return new Locator(this, `document.querySelectorAll(${JSON.stringify(selector)})[0]`); }
  getByRole(role: string, options: { name: string; exact?: boolean }) {
    const selectors = role === 'button' ? '[role="button"],button' : `[role=${JSON.stringify(role)}]`;
    return new Locator(this, `Array.from(document.querySelectorAll(${JSON.stringify(selectors)})).find(el => {
      const labelledBy = el.getAttribute('aria-labelledby');
      const label = el.getAttribute('aria-label') || (labelledBy && labelledBy.split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ')) || el.textContent?.trim() || '';
      return ${options.exact ? `label === ${JSON.stringify(options.name)}` : `label.includes(${JSON.stringify(options.name)})`};
    })`);
  }
  async $(selector: string) { return await this.evaluate(selector => !!document.querySelector(selector), selector) ? this.locator(selector) : null; }
  click(selector: string) { return this.locator(selector).click(); }
  async type(selector: string, text: string) { await this.locator(selector).focus(); await this.keyboard.type(text); }
  mouse = { click: (x: number, y: number) => this.run(() => this.view ? this.view.click(x, y) : this.firefox!.mouse.click(x, y)) };
  keyboard = {
    press: (chord: string) => this.run(async () => {
      if (this.firefox) { await this.firefox.keyboard.press(chord); return; }
      const parts = chord.split('+');
      const key = parts.pop()!;
      const modifiers = [...new Set([...this.held, ...parts])] as Bun.WebView.Modifier[];
      // CDP needs macOS editing commands alongside trusted shortcut key events.
      const commands: Record<string, string> = {
        a: 'selectAll', c: 'copy', x: 'cut', v: 'paste',
        ArrowLeft: 'moveToBeginningOfLine', ArrowRight: 'moveToEndOfLine',
        ArrowUp: 'moveToBeginningOfDocument', ArrowDown: 'moveToEndOfDocument',
      };
      if (browserName === 'chromium' && process.platform === 'darwin' && modifiers.includes('Meta') && commands[key]) {
        const codes: Record<string, number> = { a: 65, c: 67, x: 88, v: 86, ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40 };
        const modifierBits = modifiers.reduce((bits, modifier) => bits | ({ Alt: 1, Control: 2, Meta: 4, Shift: 8 }[modifier]), 0);
        const command = commands[key] + (modifiers.includes('Shift') && key.startsWith('Arrow') ? 'AndModifySelection' : '');
        const event = { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: codes[key], modifiers: modifierBits };
        await this.view!.cdp('Input.dispatchKeyEvent', { ...event, type: 'rawKeyDown', commands: [command] });
        await this.view!.cdp('Input.dispatchKeyEvent', { ...event, type: 'keyUp' });
        return;
      }
      // Named WebKit editing commands omit keydown; raw Cocoa keys preserve trusted keyboard events.
      const webkitKeys: Record<string, string> = { Tab: '\t', Enter: '\r', Backspace: '\b', Delete: '\uf728', Escape: '\u001b', Space: ' ', ArrowUp: '\uf700', ArrowDown: '\uf701', ArrowLeft: '\uf702', ArrowRight: '\uf703', Home: '\uf729', End: '\uf72b', PageUp: '\uf72c', PageDown: '\uf72d' };
      await this.view!.press(browserName === 'webkit' ? webkitKeys[key] ?? key : key === ' ' ? 'Space' : key, { modifiers });
      if (browserName === 'webkit') await this.settleWebKitInput();
    }),
    type: async (text: string) => {
      if (this.firefox) { await this.run(() => this.firefox!.keyboard.type(text)); return; }
      for (const character of text) await this.run(async () => {
        await this.view!.type(character);
        if (browserName === 'webkit') await this.settleWebKitInput();
      });
    },
    down: async (key: string) => {
      if (this.firefox) await this.run(() => this.firefox!.keyboard.down(key));
      else this.held.add(key as Bun.WebView.Modifier);
    },
    up: async (key: string) => {
      if (this.firefox) await this.run(() => this.firefox!.keyboard.up(key));
      else this.held.delete(key as Bun.WebView.Modifier);
    },
  };
  private settleWebKitInput() {
    // Raw key acknowledgements precede selectionchange and Quill's cursor update.
    return this.view!.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }
  context() {
    return { newCDPSession: async (_page: Page) => ({ send: (method: string, params?: Record<string, unknown>) => this.run(() => this.view!.cdp(method, params)) }) };
  }
  async close() {
    if (this.view) this.view.close();
    else await this.firefox!.close();
    await this.pending;
  }
  locate<R>(expression: string, fn: (node: HTMLElement) => R | Promise<R>): Promise<R> {
    return this.expression(`(async () => { const node = ${expression}; if (!node) throw new Error('Element not found: ' + ${JSON.stringify(expression)}); const result = await (${fn.toString()})(node); return result instanceof DOMRect ? result.toJSON() : result; })()`);
  }
  nativeClick(expression: string) {
    return this.locate(expression, node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }).then(({x,y}) => this.mouse.click(x,y));
  }
}

export class Locator {
  constructor(private page: Page, readonly expression: string) {}
  evaluate<R>(fn: (node: HTMLElement) => R | Promise<R>): Promise<R> { return this.page.locate(this.expression, fn); }
  locator(selector: string) { return new Locator(this.page, `(${this.expression}).querySelectorAll(${JSON.stringify(selector)})[0]`); }
  nth(index: number) { return new Locator(this.page, this.expression.replace(/\[0\]$/, `[${index}]`)); }
  innerHTML() { return this.evaluate(node => node.innerHTML); }
  inputValue() { return this.evaluate(node => (node as HTMLInputElement).value); }
  focus() { return this.evaluate(node => node.focus()); }
  async press(key: string) { await this.focus(); await this.page.keyboard.press(key); }
  async pressSequentially(text: string) { await this.focus(); await this.page.keyboard.type(text); }
  click() { return this.page.nativeClick(this.expression); }
  dispatchEvent(type: string, options: Record<string, unknown>) {
    const expression = `node => node.dispatchEvent(new ${type.startsWith('key') ? 'KeyboardEvent' : 'Event'}(${JSON.stringify(type)}, ${JSON.stringify({ bubbles: true, cancelable: true, ...options })}))`;
    return this.page.locate(this.expression, eval(`(${expression})`));
  }
}
