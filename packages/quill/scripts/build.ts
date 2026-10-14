import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import stylus from 'stylus';
import { optimize } from 'svgo';

export const packageRoot = resolve(import.meta.dir, '..');
export const sourceRoot = join(packageRoot, 'src');
export const distRoot = join(packageRoot, 'dist');
const pkg = await Bun.file(join(packageRoot, 'package.json')).json();

const banner = `/*! Quill Editor v${pkg.version}
 * Copyright (c) Slab, Jason Chen, salesforce.com
 * Licensed under BSD-3-Clause; see LICENSE.
 */`;

const svgCache = new Map<string, string>();
async function svgText(path: string) {
  if (!svgCache.has(path)) {
    svgCache.set(
      path,
      optimize(await Bun.file(path).text(), { plugins: [] }).data,
    );
  }
  return svgCache.get(path)!;
}

const svgPlugin: Bun.BunPlugin = {
  name: 'quill-inline-svg',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async ({ path }) => ({
      contents: `export default ${JSON.stringify(await svgText(path))};`,
      loader: 'js',
    }));
  },
};

const umdStart = `(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.Quill = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  var module = { exports: {} };
  var exports = module.exports;`;
const umdEnd = 'return module.exports.default;\n});';

async function transpileModules() {
  const transpiler = new Bun.Transpiler({
    loader: 'ts',
    target: 'browser',
    define: { QUILL_VERSION: JSON.stringify(pkg.version) },
  });
  for await (const path of new Bun.Glob('**/*.ts').scan(sourceRoot)) {
    if (path.endsWith('.d.ts')) continue;
    const absolutePath = join(sourceRoot, path);
    let source = await Bun.file(absolutePath).text();
    const imports = source.matchAll(
      /import\s+([\w$]+)\s+from\s+(['"])([^'"]+\.svg)\2;?/g,
    );
    for (const [statement, name, , svgPath] of imports) {
      source = source.replace(
        statement,
        `const ${name} = ${JSON.stringify(await svgText(resolve(dirname(absolutePath), svgPath)))};`,
      );
    }
    await Bun.write(
      join(distRoot, path.replace(/\.ts$/, '.js')),
      transpiler.transformSync(source),
    );
  }
}

export async function buildLibrary({
  minify = true,
  declarations = true,
} = {}) {
  svgCache.clear();
  await rm(distRoot, { recursive: true, force: true });
  await mkdir(join(distRoot, 'dist'), { recursive: true });
  await transpileModules();
  if (declarations) {
    const compiler = Bun.spawn(
      [
        process.execPath,
        Bun.resolveSync('typescript/bin/tsc', packageRoot),
        '-p',
        'tsconfig.build.json',
      ],
      { cwd: packageRoot, stdout: 'inherit', stderr: 'inherit' },
    );
    if ((await compiler.exited) !== 0)
      throw new Error('Declaration build failed');
  }
  for (const [name, entry] of [
    ['quill', 'quill'],
    ['quill.core', 'core'],
  ]) {
    const result = await Bun.build({
      entrypoints: [join(sourceRoot, `${entry}.ts`)],
      outdir: join(distRoot, 'dist'),
      naming: `${name}.js`,
      target: 'browser',
      format: 'cjs',
      minify,
      sourcemap: 'linked',
      define: { QUILL_VERSION: JSON.stringify(pkg.version) },
      plugins: [svgPlugin],
      banner: `${banner}\n${umdStart}`,
      footer: umdEnd,
    });
    if (!result.success)
      throw new AggregateError(result.logs, `${name} build failed`);
  }
  for (const theme of ['core', 'snow', 'bubble']) {
    const filename = join(sourceRoot, 'assets', `${theme}.styl`);
    const css = stylus(await Bun.file(filename).text())
      .set('filename', filename)
      .set('compress', minify)
      .render();
    await Bun.write(
      join(distRoot, 'dist', `quill.${theme}.css`),
      `${banner}\n${css}`,
    );
  }
  await cp(join(sourceRoot, 'assets'), join(distRoot, 'assets'), {
    recursive: true,
  });
  for (const filename of ['package.json', 'LICENSE']) {
    await cp(join(packageRoot, filename), join(distRoot, filename));
  }
  const readme = await Bun.file(join(packageRoot, 'README.md')).text();
  await Bun.write(
    join(distRoot, 'README.md'),
    readme.replace('.github/DEVELOPMENT.md', 'DEVELOPMENT.md'),
  );
  await cp(
    join(packageRoot, '../../.github/DEVELOPMENT.md'),
    join(distRoot, 'DEVELOPMENT.md'),
  );
  await cp(
    join(packageRoot, '../../CHANGELOG.md'),
    join(distRoot, 'CHANGELOG.md'),
  );
  console.log(
    `Built Quill ${pkg.version} with Bun ${Bun.version}: ${distRoot}`,
  );
}

if (import.meta.main) await buildLibrary();
