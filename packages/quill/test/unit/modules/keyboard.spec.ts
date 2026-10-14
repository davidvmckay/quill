import { describe, expect, test } from 'vitest';
import Quill from '../../../src/core.js';
import Keyboard, {
  SHORTKEY,
  normalize,
} from '../../../src/modules/keyboard.js';

const assert = <T>(value: T | null | undefined): T => {
  if (value == null) {
    throw new Error();
  }
  return value;
};

const createKeyboardEvent = (key: string, override?: Partial<KeyboardEvent>) =>
  new KeyboardEvent('keydown', {
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...override,
  });

describe('Keyboard', () => {
  test.each([false, true])(
    'navigate mode leaves Tab (shift=%s) to the browser',
    (shiftKey) => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      const quill = new Quill(container, {
        modules: { keyboard: { tabBehavior: 'navigate' } },
      });
      quill.setText('text');
      quill.setSelection(0);
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      quill.root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(quill.getText()).toBe('text\n');
    },
  );

  test('default mode still inserts a tab', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const quill = new Quill(container);
    quill.setText('text');
    quill.setSelection(0);
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    quill.root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(quill.getText()).toBe('\ttext\n');
  });

  describe('match', () => {
    test('no modifiers', () => {
      const binding = normalize({
        key: 'a',
      });
      expect(Keyboard.match(createKeyboardEvent('a'), assert(binding))).toBe(
        true,
      );
      expect(
        Keyboard.match(
          createKeyboardEvent('A', { altKey: true }),
          assert(binding),
        ),
      ).toBe(false);
    });

    test('simple modifier', () => {
      const binding = normalize({
        key: 'a',
        altKey: true,
      });
      expect(Keyboard.match(createKeyboardEvent('a'), assert(binding))).toBe(
        false,
      );
      expect(
        Keyboard.match(
          createKeyboardEvent('a', { altKey: true }),
          assert(binding),
        ),
      ).toBe(true);
    });

    test('optional modifier', () => {
      const binding = normalize({
        key: 'a',
        altKey: null,
      });
      expect(Keyboard.match(createKeyboardEvent('a'), assert(binding))).toBe(
        true,
      );
      expect(
        Keyboard.match(
          createKeyboardEvent('a', { altKey: true }),
          assert(binding),
        ),
      ).toBe(true);
    });

    test('shortkey modifier', () => {
      const binding = normalize({
        key: 'a',
        shortKey: true,
      });
      expect(Keyboard.match(createKeyboardEvent('a'), assert(binding))).toBe(
        false,
      );
      expect(
        Keyboard.match(
          createKeyboardEvent('a', { [SHORTKEY]: true }),
          assert(binding),
        ),
      ).toBe(true);
    });

    test('native shortkey modifier', () => {
      const binding = normalize({
        key: 'a',
        [SHORTKEY]: true,
      });
      expect(Keyboard.match(createKeyboardEvent('a'), assert(binding))).toBe(
        false,
      );
      expect(
        Keyboard.match(
          createKeyboardEvent('a', { [SHORTKEY]: true }),
          assert(binding),
        ),
      ).toBe(true);
    });
  });
});
