import { beforeAll, afterAll } from 'bun:test';
import { closeBrowsers, baseURL } from '../browser/page.js';

let server: ReturnType<typeof Bun.spawn>;
beforeAll(async () => {
  server = Bun.spawn([process.execPath, 'scripts/serve.ts', '--test', '--port', '9001'], { stdout: 'ignore', stderr: 'inherit' });
  const deadline = performance.now() + 30000;
  while (performance.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server exited with ${server.exitCode}`);
    try { if ((await fetch(baseURL)).ok) return; } catch {}
    await Bun.sleep(50);
  }
  throw new Error('Test server failed to start');
}, 40000);
afterAll(async () => { await closeBrowsers(); server?.kill(); if (server) await server.exited; });
await import('./fixtures/index.js');
