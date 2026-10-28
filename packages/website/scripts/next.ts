import { watch } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const root = join(import.meta.dir, '..');
const command = Bun.argv[2] ?? 'dev';
if (!['dev', 'build', 'start'].includes(command)) throw new Error(`Unknown Next.js command: ${command}`);

if (command === 'start') {
  const output = resolve(root, 'out');
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: Number(Bun.env.PORT ?? 9000),
    async fetch(request) {
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(request.url).pathname); }
      catch { return new Response('Bad request', { status: 400 }); }
      const path = resolve(output, `.${pathname}`);
      if (path !== output && !path.startsWith(`${output}${sep}`)) return new Response('Not found', { status: 404 });
      for (const candidate of [path, `${path}.html`, join(path, 'index.html')]) {
        const file = Bun.file(candidate);
        if (await file.exists()) return new Response(file);
      }
      return new Response(Bun.file(join(output, '404.html')), { status: 404 });
    },
  });
  console.log(`Static documentation: ${server.url}`);
  await new Promise<void>((done) => {
    const stop = () => { server.stop(true); done(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  process.exit(0);
}

async function writeConfig() {
  // Next 14 loads .mjs configs; the maintained configuration and imports are TypeScript.
  const result = await Bun.build({
    entrypoints: [join(root, 'next.config.ts')],
    outdir: root,
    naming: 'next.config.mjs',
    format: 'esm',
    target: 'bun',
    packages: 'external',
  });
  if (!result.success) throw new AggregateError(result.logs, 'Next.js configuration failed to build');
}

await writeConfig();
const child = Bun.spawn([
  process.execPath,
  Bun.resolveSync('next/dist/bin/next', root),
  command,
  ...(command === 'build' ? [] : ['--port', Bun.env.PORT ?? '9000']),
], { cwd: root, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });

const watchers = command === 'dev'
  ? ['next.config.ts', 'env.ts'].map(filename => watch(join(root, filename), () => {
      void writeConfig().catch(console.error);
    }))
  : [];
const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
const code = await child.exited;
watchers.forEach(watcher => watcher.close());
await rm(join(root, 'next.config.mjs'), { force: true });
process.exit(code);
