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
await run('lint');
for (const browser of ['chromium', 'firefox', 'webkit']) {
  await run('test:unit', { BROWSER: browser });
}
await run('test:fuzz');
await run('test:e2e');
