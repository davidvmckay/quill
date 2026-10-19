export {};
if (Bun.env.QUILL_TEST_KIND === 'e2e') {
  await import('./e2e/preload.js');
} else {
  await import('./unit/__helpers__/setup.js');
}
