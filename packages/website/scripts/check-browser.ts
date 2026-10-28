import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const library = resolve(root, '../..');
const scripts = new Map<string, string>();
for (const name of ['snow', 'form', 'custom-formats', 'react']) {
  const entry = name === 'react'
    ? join(root, 'test/browser-client.tsx')
    : join(root, 'src/playground', name, 'index.ts');
  const result = await Bun.build({
    entrypoints: [entry], target: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  if (!result.success) throw new AggregateError(result.logs, `Browser example ${name} failed to build`);
  scripts.set(`/${name}.js`, await result.outputs[0].text());
}

const server = Bun.serve({
  hostname: '127.0.0.1', port: 0,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/quill.js' || pathname === '/quill.snow.css') {
      return new Response(Bun.file(join(library, 'dist/dist', pathname.slice(1))));
    }
    if (scripts.has(pathname)) return new Response(scripts.get(pathname), { headers: { 'Content-Type': 'application/javascript' } });
    const name = pathname.slice(1);
    if (!['snow', 'form', 'custom-formats', 'react'].includes(name)) return new Response('Not found', { status: 404 });
    let html = name === 'react' ? '<div id="root"></div>'
      : await Bun.file(join(root, 'src/playground', name, 'index.html')).text();
    html = html.replace(/<script[^>]*src="\/index\.ts"[^>]*><\/script>/g, '')
      .replace(/<link[^>]*href="https?:[^>]*>/g, '');
    return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/quill.snow.css"></head><body>${html}<script src="/quill.js"></script><script src="/${name}.js"></script></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});
const view = new Bun.WebView({ backend: { type: 'chrome', url: false }, width: 1000, height: 800 });
async function waitFor(expression: string) {
  const deadline = performance.now() + 10000;
  while (performance.now() < deadline) {
    if (await view.evaluate<boolean>(`Boolean(${expression})`)) return;
    await Bun.sleep(20);
  }
  throw new Error(`Example did not settle: ${expression}`);
}

try {
  for (const name of ['snow', 'form', 'custom-formats', 'react']) {
    await view.navigate(new URL(name, server.url).href);
    await view.cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await view.cdp('Page.bringToFront');
    await waitFor('document.querySelector(".ql-editor")');
    if (name === 'form') {
      assert.equal(await view.evaluate('document.querySelector("[name=name]").value'), 'Wall-E');
      const about = await view.evaluate<string>('new FormData(document.querySelector("form")).get("about")');
      assert.match(about, /A robot who has developed sentience/);
      await view.evaluate('document.querySelector("[name=name]").value = "Changed"');
      await view.click('#resetForm');
      assert.equal(await view.evaluate('document.querySelector("[name=name]").value'), 'Wall-E');
    } else if (name === 'custom-formats') {
      assert.deepEqual(await view.evaluate('Quill.import("formats/font").whitelist'), ['mirza', 'roboto']);
    } else if (name === 'react') {
      await waitFor('document.querySelector(".ql-editor").textContent.includes("Some initial content")');
      const contents = await view.evaluate('document.querySelector(".ql-editor").innerHTML');
      await view.click('input[type=checkbox]');
      await waitFor('document.querySelector(".ql-editor").contentEditable === "false"');
      await view.click('input[type=checkbox]');
      await waitFor('document.querySelector(".ql-editor").contentEditable === "true"');
      assert.equal(await view.evaluate('document.querySelector(".ql-editor").innerHTML'), contents);
      await view.click('.ql-editor');
      await view.type('!');
      await waitFor('document.querySelector(".state:last-child").textContent.includes("insert")');
    } else {
      assert.equal(await view.evaluate('window.quill.getText()'), '\n');
    }
    console.log(`Browser example passed: ${name}`);
  }
} finally {
  view.close();
  Bun.WebView.closeAll();
  server.stop(true);
}
