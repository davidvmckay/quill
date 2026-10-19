import { describe, expect, test } from 'bun:test';
import { cloneDeep, isEqual, merge } from '../../../src/utils/object.js';
import { Range } from '../../../src/core/selection.js';
import Delta from 'quill-delta';

describe('shared object utilities', () => {
  test('clones formatting data without losing callbacks, regular expressions or Range prototypes', () => {
    const handler = () => true;
    const expression = /word/gi;
    expression.lastIndex = 2;
    const source = { handler, expression, range: new Range(2, 4), formats: [{ bold: true }] };
    const copied = cloneDeep(source);
    expect(copied.handler).toBe(handler);
    expect(copied.expression).not.toBe(expression);
    expect(copied.expression.source).toBe('word');
    expect(copied.expression.flags).toBe('gi');
    expect(copied.expression.lastIndex).toBe(2);
    expect(copied.range).toBeInstanceOf(Range);
    expect(copied.range).not.toBe(source.range);
    copied.formats[0].bold = false;
    expect(source.formats[0].bold).toBe(true);
  });

  test('preserves cycles and shared references while copying maps, sets, dates and buffers', () => {
    const shared = { value: 1 };
    const source: any = { first: shared, second: shared, date: new Date(42), map: new Map([['key', shared]]), set: new Set([shared]), buffer: new Uint8Array([1, 2]) };
    source.self = source;
    const copied = cloneDeep(source);
    expect(copied.self).toBe(copied);
    expect(copied.first).toBe(copied.second);
    expect(copied.first).not.toBe(shared);
    expect(copied.map.get('key')).toBe(copied.first);
    expect([...copied.set][0]).toBe(copied.first);
    expect(copied.date.getTime()).toBe(42);
    expect(copied.date).not.toBe(source.date);
    copied.buffer[0] = 9;
    expect(source.buffer[0]).toBe(1);
  });

  test('merges nested defaults and arrays by index while ignoring undefined overrides', () => {
    const handler = () => true;
    const defaults = { array: [{ left: true }, 2], modules: { toolbar: { handlers: { link: handler } } } };
    const result = merge({}, defaults, { array: [{ right: true }], modules: { toolbar: { handlers: { link: undefined } } } });
    expect(result as unknown).toEqual({ array: [{ left: true, right: true }, 2], modules: { toolbar: { handlers: { link: handler } } } });
    expect(defaults.array).toEqual([{ left: true }, 2]);
    expect(merge({ array: [1] }, { array: Array(3) }).array as unknown).toEqual([1, undefined, undefined]);
  });

  test('retains DOM containers and constructed services by identity during configuration merges', () => {
    class Service { value = 1; }
    const container = document.createElement('div');
    const service = new Service();
    const result = merge({}, { toolbar: { container }, service });
    expect(result.toolbar.container).toBe(container);
    expect(result.service).toBe(service);
  });

  test('does not mutate global prototypes when cloning or merging hostile keys', () => {
    const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
    for (const result of [cloneDeep(source), merge({}, source)]) {
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
    }
    expect((Object.prototype as any).polluted).toBeUndefined();
    expect((Object as any).polluted).toBeUndefined();
  });

  test('compares Delta contents and custom format values structurally', () => {
    const first = new Delta().insert('text', { bold: true });
    expect(isEqual(first, new Delta().insert('text', { bold: true }))).toBe(true);
    expect(isEqual(first, new Delta().insert('text', { bold: false }))).toBe(false);
    expect(isEqual({ left: 1, right: 2 }, { right: 2, left: 1 })).toBe(true);
    expect(isEqual({ value: undefined }, {})).toBe(false);
    expect(isEqual(new Range(1, 2), new Range(1, 3))).toBe(false);
    expect(isEqual(NaN, NaN)).toBe(true);
    expect(isEqual(-0, 0)).toBe(true);
  });

  test('handles cyclic data and unordered maps and sets without conflating unequal values', () => {
    const first: any = { value: 1 };
    first.self = first;
    const second: any = { value: 1 };
    second.self = second;
    expect(isEqual(first, second)).toBe(true);
    second.value = 2;
    expect(isEqual(first, second)).toBe(false);
    expect(isEqual(new Set([{ value: 1 }, 2]), new Set([2, { value: 1 }]))).toBe(true);
    expect(isEqual(new Map([[{ key: 1 }, 'a']]), new Map([[{ key: 1 }, 'b']]))).toBe(false);
    expect(isEqual(new Float64Array([-0, NaN]), new Float64Array([0, NaN]))).toBe(true);
  });
});
