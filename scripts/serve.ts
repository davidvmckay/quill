import { watch } from 'node:fs';
import { join } from 'node:path';
import { buildLibrary, distRoot, packageRoot, sourceRoot, svgPlugin } from './build.ts';

const portIndex = Bun.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? Bun.argv[portIndex + 1] : 9080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Expected --port between 1 and 65535');
}
const production = Bun.argv.includes('--test');
await buildLibrary({ minify: production, declarations: production });

const fixtures = join(packageRoot, 'test/e2e/__dev_server__');
const result = await Bun.build({
  entrypoints: [join(fixtures, 'highlight.ts'), join(fixtures, 'modules.ts'), join(fixtures, 'geometry.ts'), join(fixtures, 'editor.ts')],
  target: 'browser',
  format: 'iife',
  naming: '[name].js',
  outdir: join(packageRoot, '.bun', 'fixtures'),
  plugins: [svgPlugin],
  tsconfig: join(packageRoot, 'tsconfig.build.json'),
  files: {
    [join(fixtures, 'highlight.ts')]:
      'import hljs from "highlight.js"; window.hljs = hljs;',
    [join(fixtures, 'modules.ts')]:
      `import Quill from 'quill';
      import Bold from 'quill/formats/bold';
      import * as Parchment from 'quill/parchment';
      import Delta from 'quill/delta';
      window.QuillModules = { Quill, Bold, Parchment, Delta };`,
  },
});
if (!result.success)
  throw new AggregateError(result.logs, 'Test fixtures failed to build');

const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/')
      return new Response(Bun.file(join(fixtures, 'index.html')));
    if (!/^\/[\w.-]+\.(js|css|map)$/.test(pathname)) {
      return new Response('Not found', { status: 404 });
    }
    if (pathname === '/axe.js') return new Response(Bun.file(Bun.resolveSync('axe-core/axe.min.js', packageRoot)));
    const fixture = ['/highlight.js', '/modules.js', '/geometry.js', '/editor.js'].includes(pathname);
    const file = Bun.file(
      join(
        fixture
          ? join(packageRoot, '.bun', 'fixtures')
          : join(distRoot, 'dist'),
        pathname.slice(1),
      ),
    );
    return (await file.exists())
      ? new Response(file)
      : new Response('Not found', { status: 404 });
  },
});
console.log(`Quill development server: ${server.url}`);

if (Bun.argv.includes('--watch')) {
  let rebuildTimer: ReturnType<typeof setTimeout>;
  let rebuilding = Promise.resolve();
  const onSourceChange = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuilding = rebuilding.then(async () => {
        try {
          await buildLibrary({ minify: production, declarations: production });
        } catch (error) {
          console.error(error);
        }
      });
    }, 150);
  };
  watch(sourceRoot, { recursive: true }, onSourceChange);
}
