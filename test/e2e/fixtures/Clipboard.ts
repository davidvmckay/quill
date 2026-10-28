import type { Page } from '../../browser/page.js';
import { SHORTKEY } from '../utils/index.js';

class Clipboard {
  constructor(private page: Page) {}

  async copy() {
    await this.page.keyboard.press(`${SHORTKEY}+c`);
  }

  async cut() {
    await this.page.keyboard.press(`${SHORTKEY}+x`);
  }

  async paste() {
    await this.page.keyboard.press(`${SHORTKEY}+v`);
  }

  async writeText(value: string) {
    // Some browser backends lack the async clipboard API.
    const hasFallbackWritten = await this.page.evaluate((value) => {
      if (navigator.clipboard) return false;
      const activeElement = document.activeElement as HTMLElement | null;
      const selection = document.getSelection();
      const ranges = Array.from({ length: selection?.rangeCount ?? 0 }, (_, index) =>
        selection!.getRangeAt(index).cloneRange(),
      );
      const textArea = document.createElement('textarea');
      textArea.value = value;

      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const isSupported = document.execCommand('copy');
      textArea.remove();
      activeElement?.focus({ preventScroll: true });
      selection?.removeAllRanges();
      ranges.forEach((range) => selection?.addRange(range));
      return isSupported;
    }, value);

    if (!hasFallbackWritten) {
      await this.write(value, 'text/plain');
    }
  }

  async writeHTML(value: string) {
    return this.write(value, 'text/html');
  }

  async readText() {
    return this.read('text/plain');
  }

  async readHTML() {
    const html = await this.read('text/html');
    return html.replace(/<meta[^>]*>/g, '');
  }

  private async read(type: string) {
    const isHTML = type === 'text/html';
    await this.page.evaluate((isHTML) => {
      const dataContainer = document.createElement(isHTML ? 'div' : 'textarea');
      if (isHTML) dataContainer.setAttribute('contenteditable', 'true');
      dataContainer.id = '_readClipboard';
      document.body.appendChild(dataContainer);
      dataContainer.focus();
      return dataContainer;
    }, isHTML);
    await this.paste();
    const locator = this.page.locator('#_readClipboard');
    const data = await (isHTML ? locator.innerHTML() : locator.inputValue());
    await locator.evaluate((node) => node.remove());
    return data;
  }

  private async write(data: string, type: string) {
    await this.page.evaluate(
      async ({ data, type }) => {
        if (type === 'text/html') {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([data], { type: 'text/html' }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(data);
        }
      },
      { data, type },
    );
  }
}

export default Clipboard;
