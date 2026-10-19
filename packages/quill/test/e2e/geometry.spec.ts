import { expect } from 'bun:test';
import { test } from './fixtures/index.js';

const cases = [
  'empty document', 'empty line', 'plain text', 'multiple characters',
  'start of line', 'end of line', 'selection starting at end of text node',
  'multiple lines', 'large text', 'image', 'beyond document',
  'scroll upward', 'scroll downward', 'scroll-padding', 'inline scroll',
  'scroll smoothly', 'getBounds index API', 'getBounds range API',
];
cases.forEach((name, index) => {
  test(`editor geometry: ${name}`, async ({ page }) => {
    await page.goto('/');
    await page.addScriptTag({ url: '/geometry.js' });
    const checks = await page.evaluate(async (index) => {
      // @ts-expect-error Populated by the browser-only geometry fixture.
      const cases = window.Geometry;
      if (cases.length !== 18) throw new Error('Geometry case inventory changed');
      return await cases[index].run() as {
        matcher: string; actual: unknown; expected: unknown; tolerance?: number;
      }[];
    }, index);
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      if (check.matcher === 'approximately') {
        expect(Math.abs(Number(check.actual) - Number(check.expected))).toBeLessThanOrEqual(check.tolerance!);
      } else if (check.matcher === 'toBeGreaterThan') {
        expect(Number(check.actual)).toBeGreaterThan(Number(check.expected));
      } else if (check.matcher === 'toBe') {
        expect(check.actual).toBe(check.expected);
      } else if (check.matcher === 'toEqual') {
        expect(check.actual).toEqual(check.expected);
      } else {
        throw new Error(`Unsupported geometry assertion: ${check.matcher}`);
      }
    }
  });
});
