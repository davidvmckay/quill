import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { compressToEncodedURIComponent } from 'lz-string';
import env from '../env';
import flattenData from '../src/utils/flattenData';
import { readMetadata, readOverrides } from '../src/utils/playground';
import replaceCDN from '../src/utils/replaceCDN';

assert.deepEqual(readOverrides(''), {});
assert.deepEqual(readOverrides('#codeinvalid'), {});
assert.deepEqual(readOverrides(`#code${compressToEncodedURIComponent('null')}`), {});
assert.deepEqual(readOverrides(`#code${compressToEncodedURIComponent('["not a file map"]')}`), {});
const files = { '/index.ts': 'const text: string = "hello";', '/styles.css': 'body {}' };
assert.deepEqual(readOverrides(`#code${compressToEncodedURIComponent(JSON.stringify(files))}`), files);
assert.deepEqual(readOverrides(`#code${compressToEncodedURIComponent('{"/index.ts":"text","bad":42}')}`), { '/index.ts': 'text' });
assert.throws(() => readMetadata('{"template":"unknown"}'));
assert.throws(() => readMetadata('{"externalResources":[1]}'));
assert.throws(() => readMetadata('{"activeFile":true}'));
assert.equal(replaceCDN('{{site.version}}'), env.version);
assert.equal(replaceCDN('{{site.cdn}}'), process.env.cdn ?? env.cdn);
assert.throws(() => replaceCDN('{{site.missing}}'));
assert.deepEqual(flattenData([
  { title: 'API', url: '/docs/api', children: [{ title: 'Anchor', url: '/docs/api#anchor' }] },
  { title: 'Delta', url: '/docs/delta' },
]).map(item => item.url), ['/docs/api', '/docs/delta']);

const root = join(import.meta.dir, '..');
for (const name of ['snow', 'form', 'custom-formats', 'react']) {
  const directory = join(root, 'src/playground', name);
  const metadata = readMetadata(await Bun.file(join(directory, 'playground.json')).text());
  assert(metadata.activeFile && (await readdir(directory)).includes(metadata.activeFile));
  const entry = join(directory, name === 'react' ? 'App.tsx' : 'index.ts');
  const result = await Bun.build({ entrypoints: [entry], target: 'browser', format: 'esm' });
  if (!result.success) throw new AggregateError(result.logs, `${name} TypeScript example did not compile`);
  if (name !== 'react') {
    assert((await Bun.file(join(directory, 'index.html')).text()).includes('src="/index.ts"'));
  }
}
console.log('Website checks passed: typed playground bundles, metadata, shared edits, navigation, and template variables');
