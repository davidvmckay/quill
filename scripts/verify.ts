import { packageRoot } from './build.ts';

async function run(script: string, env: Record<string, string> = {}) {
  const child = Bun.spawn([Bun.argv[0], 'run', script], {
    cwd: packageRoot,
    env: { ...Bun.env, ...env },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await child.exited) !== 0) throw new Error(`${script} failed`);
}

await run('build');
await run('typecheck');
await run('test:package');
await run('test:unit');
await run('test:fuzz');
for (const browser of ['chromium', 'firefox', 'webkit']) {
  if (browser === 'webkit' && process.platform !== 'darwin') continue;
  await run('test:e2e', { BROWSER: browser });
}
