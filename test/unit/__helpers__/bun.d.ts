import 'bun:test';
declare module 'bun:test' {
  interface Matchers<T = any> {
    toEqualHTML(html: string, options?: { ignoreAttrs?: string[] }): void;
  }
}
