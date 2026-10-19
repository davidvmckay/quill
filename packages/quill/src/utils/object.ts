// Clone and merge policies adapted from m-dash/core/lodash-compat.ts.
// Keep callbacks and opaque configuration objects usable in browser builds.
const enumerableKeys = (value: object) =>
  Reflect.ownKeys(value).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(value, key),
  );

const setOwn = (target: object, key: PropertyKey, value: unknown) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
};

const isObject = (value: unknown): value is object =>
  value !== null && typeof value === 'object';

const isPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

export function cloneDeep<T>(value: T): T {
  const seen = new WeakMap<object, unknown>();
  const clone = (current: unknown): unknown => {
    if (!isObject(current)) return current;
    if (seen.has(current)) return seen.get(current);
    if (typeof Node !== 'undefined' && current instanceof Node) return current;
    if (typeof Blob !== 'undefined' && current instanceof Blob) return current;
    let result: any;
    if (current instanceof Number || current instanceof String || current instanceof Boolean) {
      result = Object(current.valueOf());
    } else if (current instanceof Date) {
      result = new Date(current.getTime());
    } else if (current instanceof RegExp) {
      result = new RegExp(current.source, current.flags);
      result.lastIndex = current.lastIndex;
    } else if (current instanceof ArrayBuffer) {
      result = current.slice(0);
    } else if (ArrayBuffer.isView(current)) {
      const buffer = clone(current.buffer) as ArrayBuffer;
      result = current instanceof DataView
        ? new DataView(buffer, current.byteOffset, current.byteLength)
        : new (current.constructor as any)(buffer, current.byteOffset, (current as any).length);
    } else if (current instanceof Map) {
      result = new Map();
      seen.set(current, result);
      current.forEach((entry, key) => result.set(key, clone(entry)));
    } else if (current instanceof Set) {
      result = new Set();
      seen.set(current, result);
      current.forEach((entry) => result.add(clone(entry)));
    } else if (current instanceof WeakMap || current instanceof WeakSet || current instanceof Promise) {
      return current;
    } else {
      result = Array.isArray(current)
        ? Array.from({ length: current.length }, () => undefined)
        : Object.create(Object.getPrototypeOf(current));
    }
    seen.set(current, result);
    for (const key of enumerableKeys(current)) {
      if (Object.getOwnPropertyDescriptor(result, key)?.configurable === false) continue;
      setOwn(result, key, clone(Reflect.get(current, key)));
    }
    return result;
  };
  return clone(value) as T;
}

export function merge<T extends object, S extends readonly unknown[]>(target: T, ...sources: S): T & S[number] {
  const mergeValue = (destination: unknown, source: unknown, seen: WeakMap<object, unknown>): unknown => {
    if (source === undefined) return destination;
    if (!Array.isArray(source) && !isPlainObject(source)) return source;
    if (seen.has(source)) return seen.get(source);
    const result = Array.isArray(source)
      ? Array.isArray(destination) ? destination : []
      : isPlainObject(destination) ? destination : {};
    seen.set(source, result);
    // Arrays merge by index. Never read or recurse into inherited properties.
    const keys = Array.isArray(source)
      ? [...new Set([...Array.from({ length: source.length }, (_, index) => String(index)), ...Object.keys(source)])]
      : Object.keys(source);
    for (const key of keys) {
      const current = Object.prototype.hasOwnProperty.call(result, key) ? Reflect.get(result, key) : undefined;
      setOwn(result, key, mergeValue(current, Reflect.get(source, key), seen));
    }
    return result;
  };
  for (const source of sources) {
    if (!isObject(source)) continue;
    const seen = new WeakMap<object, unknown>();
    for (const key of Object.keys(source)) {
      const current = Object.prototype.hasOwnProperty.call(target, key) ? Reflect.get(target, key) : undefined;
      setOwn(target, key, mergeValue(current, Reflect.get(source, key), seen));
    }
  }
  return target as T & S[number];
}

export function isEqual(left: unknown, right: unknown): boolean {
  const pairs = new WeakMap<object, object>();
  const equal = (a: unknown, b: unknown): boolean => {
    if (a instanceof Number || a instanceof String || a instanceof Boolean) a = a.valueOf();
    if (b instanceof Number || b instanceof String || b instanceof Boolean) b = b.valueOf();
    if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
    if (!isObject(a) || !isObject(b)) return false;
    const tag = Object.prototype.toString.call(a);
    if (tag !== Object.prototype.toString.call(b)) return false;
    if (pairs.has(a)) return pairs.get(a) === b;
    pairs.set(a, b);
    let result: boolean;
    if (a instanceof Date) {
      result = equal(a.getTime(), (b as Date).getTime());
    } else if (a instanceof RegExp) {
      result = a.source === (b as RegExp).source && a.flags === (b as RegExp).flags;
    } else if (ArrayBuffer.isView(a) && !(a instanceof DataView)) {
      const x = a as unknown as ArrayLike<number | bigint>;
      const y = b as unknown as ArrayLike<number | bigint>;
      result = x.length === y.length && Array.from(x).every((entry, index) => equal(entry, y[index]));
    } else if (a instanceof ArrayBuffer || a instanceof DataView) {
      const bytes = (value: any) => value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      const x = bytes(a);
      const y = bytes(b);
      result = x.length === y.length && x.every((byte, index) => byte === y[index]);
    } else if (a instanceof Map || a instanceof Set) {
      const x = [...a.entries()];
      const y = [...(b as Map<unknown, unknown>).entries()];
      result = x.length === y.length && x.every((entry) => {
        const index = y.findIndex((candidate) => equal(entry[0], candidate[0]) && equal(entry[1], candidate[1]));
        if (index < 0) return false;
        y.splice(index, 1);
        return true;
      });
    } else if (Array.isArray(a)) {
      result = a.length === (b as unknown[]).length && Array.from(a).every((entry, index) => equal(entry, (b as unknown[])[index]));
    } else if (tag === '[object Object]') {
      const keys = enumerableKeys(a);
      result = (isPlainObject(a) && isPlainObject(b) || a.constructor === b.constructor)
        && keys.length === enumerableKeys(b).length
        && keys.every((key) => Object.prototype.propertyIsEnumerable.call(b, key) && equal(Reflect.get(a, key), Reflect.get(b, key)));
    } else {
      result = false;
    }
    pairs.delete(a);
    return result;
  };
  return equal(left, right);
}
