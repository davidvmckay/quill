import { join } from 'node:path';
import { packageRoot } from './build.ts';

const [kind, ...arguments_] = Bun.argv.slice(2);
if (!['unit', 'fuzz', 'e2e'].includes(kind)) throw new Error('Expected unit, fuzz or e2e');
const watch = arguments_.includes('--watch');
const patterns = arguments_.filter(value => value !== '--watch' && value !== '--');
const root = join(packageRoot, 'test', kind);
const files = (await Array.fromAsync(new Bun.Glob('**/*.spec.ts').scan(root)))
  .filter(path => patterns.length === 0 || patterns.some(pattern => path.includes(pattern)))
  .sort()
  .map(path => join(root, path));
if (files.length === 0) throw new Error(`No ${kind} tests match: ${patterns.join(', ')}`);
const child = Bun.spawn([
  process.execPath, 'test', '--timeout', kind === 'unit' ? '5000' : '40000',
  ...(kind === 'e2e' ? [] : ['--isolate']),
  ...(watch ? ['--watch'] : []), ...files,
], { cwd: packageRoot, env: { ...Bun.env, QUILL_TEST_KIND: kind }, stdout: 'inherit', stderr: 'inherit' });
process.exit(await child.exited);
