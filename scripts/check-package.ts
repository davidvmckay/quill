import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { packageRoot } from './build.ts';

const library = Bun.argv[2] ? resolve(Bun.argv[2]) : packageRoot;
const distRoot = join(library, 'dist');

if (!(await Bun.file(join(distRoot, 'quill.js')).exists())) {
  throw new Error('Run bun run build before checking the consumer package');
}

const consumer = await mkdtemp(join(tmpdir(), 'quill-package-'));
try {
  await mkdir(join(consumer, 'node_modules'));
  await symlink(library, join(consumer, 'node_modules/quill'));
  const configs = {
    parchment: 'export { Registry, InlineBlot } from "quill/parchment";',
    delta: 'export { default } from "quill/delta";',
    core: 'export { default } from "quill/core";',
    css: 'import "quill/dist/quill.snow.css"; export { Registry } from "quill/parchment";',
  };
  for (const [name, source] of Object.entries(configs)) {
    const entry = join(consumer, `${name}.ts`);
    await Bun.write(entry, source);
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: join(consumer, name),
      target: 'browser',
      format: 'esm',
      minify: true,
      metafile: true,
    });
    if (!result.success) throw new AggregateError(result.logs, `${name} consumer bundle failed`);
    const inputs = Object.keys(result.metafile!.inputs).map(value => value.replaceAll('\\', '/'));
    assert(inputs.every(value => !value.includes('/src/')), `${name} must consume compiled files`);
    if (name === 'parchment' || name === 'css') {
      assert(inputs.some(value => value.includes('/parchment/')), 'Parchment entry must include its model');
      assert(inputs.every(value => !/\/(?:delta|core|formats|modules|themes)\//.test(value)
        && !/\/(?:quill|core)\.js$/.test(value)
        && !/\/(?:eventemitter3|fast-diff)\//.test(value)), 'Parchment-only consumers must exclude the editor and Delta');
    }
    if (name === 'delta') {
      assert(inputs.some(value => value.includes('/delta/')), 'Delta entry must include its operations');
      assert(inputs.every(value => !/\/(?:parchment|core|formats|modules|themes|eventemitter3)\//.test(value)
        && !/\/(?:quill|core)\.js$/.test(value)), 'Delta-only consumers must exclude the editor and Parchment');
    }
    if (name === 'core') {
      assert(inputs.every(value => !value.includes('/themes/') && !value.endsWith('/modules/syntax.js')),
        'Core consumers must exclude full-editor themes and syntax');
    }
    if (name === 'css') {
      const styles = result.outputs.filter(value => value.path.endsWith('.css'));
      assert(styles.length > 0, 'CSS must survive consumer tree shaking');
      assert((await styles[0].text()).includes('.ql-editor'), 'Consumer styles must contain editor rules');
    }
  }

  await Bun.write(join(consumer, 'types.ts'), `
import Quill from 'quill';
import Core from 'quill/core';
import Delta from 'quill/delta';
import { Registry, InlineBlot } from 'quill/parchment';
import Bold from 'quill/formats/bold';
import BoldWithExtension from 'quill/formats/bold.js';
class CustomInline extends InlineBlot { static blotName = 'custom'; static tagName = 'MARK'; }
const registry = new Registry();
registry.register(CustomInline, Bold, BoldWithExtension);
const editor: Core = new Quill(document.createElement('div'), { registry });
const contents: Delta = editor.getContents();
editor.setContents(contents.compose(new Delta().insert('text')));
`);
  await Bun.write(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2021', module: 'ESNext', moduleResolution: 'bundler', strict: true, types: [], noEmit: true },
    include: ['types.ts'],
  }));
  const checker = Bun.spawn([process.execPath, 'check'], {
    cwd: consumer, stdout: 'inherit', stderr: 'inherit',
  });
  assert.equal(await checker.exited, 0, 'Standalone consumer types must compile');
  console.log('Consumer checks passed: independent Parchment, Delta, core, CSS, deep imports, and declarations');
} finally {
  await rm(consumer, { recursive: true, force: true });
}
