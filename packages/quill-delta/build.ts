import { mkdir, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = import.meta.dir;
await rm(join(root, 'dist'), { recursive: true, force: true });
await mkdir(join(root, 'dist'), { recursive: true });
const result = await Bun.build({
  entrypoints: [join(root, 'src/Delta.ts')],
  outdir: join(root, 'dist'),
  target: 'browser',
  format: 'esm',
  naming: 'Delta.js',
  external: ['fast-diff'],
  banner: '/*! Quill Delta 5.1.0, internal adaptation. BSD-3-Clause; see LICENSE. */',
});
if (!result.success) throw new AggregateError(result.logs, 'Delta build failed');
// Bun checks types; TypeScript is used solely to emit public declarations.
const compiler = Bun.spawn([process.execPath, Bun.resolveSync('typescript/bin/tsc', root), '-p', 'tsconfig.json'], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
if (await compiler.exited) throw new Error('Delta declaration emission failed');
for (const name of ['Delta', 'Op', 'OpIterator', 'AttributeMap']) {
  await cp(join(root, '.bun/declarations/quill-delta/src', `${name}.d.ts`), join(root, 'dist', `${name}.d.ts`));
}
const manifest = await Bun.file(join(root, 'package.json')).json();
await Bun.write(join(root, 'dist/package.json'), JSON.stringify({ ...manifest, main: 'Delta.js', types: 'Delta.d.ts', scripts: undefined }, null, 2) + '\n');
for (const filename of ['LICENSE', 'README.md']) {
  await cp(join(root, filename), join(root, 'dist', filename));
}
