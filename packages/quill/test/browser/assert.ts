import { expect } from 'bun:test';
import { Locator, waitFor } from './page.js';

export function expectElement(locator: Locator) {
  const equal = async (read: (node: HTMLElement) => unknown, expected: unknown) => {
    let actual: unknown;
    await waitFor(async () => {
      actual = await locator.evaluate(read);
      return Bun.deepEquals(actual, expected);
    }, 5000).catch(() => { expect(actual).toEqual(expected); });
    expect(actual).toEqual(expected);
  };
  return {
    toBeFocused: () => equal(node => node === document.activeElement, true),
    toBeVisible: () => equal(node => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden', true),
    toHaveValue: (value: string) => equal(node => (node as HTMLInputElement).value, value),
    toHaveAttribute: (name: string, value: string) => equal(new Function('node', `return node.getAttribute(${JSON.stringify(name)})`) as (node: HTMLElement) => unknown, value),
    toHaveCSS: (name: string, value: string) => equal(new Function('node', `return getComputedStyle(node).getPropertyValue(${JSON.stringify(name)})`) as (node: HTMLElement) => unknown, value),
  };
}
