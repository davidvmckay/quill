import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    {
      name: 'quill-inline-svg',
      enforce: 'pre',
      load(id) {
        if (id.endsWith('.svg')) {
          return `export default ${JSON.stringify(readFileSync(id, 'utf8'))};`;
        }
      },
    },
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  test: {
    include: [resolve(__dirname, '**/*.spec.ts')],
    typecheck: {
      enabled: true,
      include: [resolve(__dirname, '**/*.test-d.ts')],
    },
    setupFiles: [
      resolve(__dirname, '__helpers__/expect.ts'),
      resolve(__dirname, '__helpers__/cleanup.ts'),
    ],
    browser: {
      enabled: true,
      provider: 'playwright',
      name: process.env.BROWSER || 'chromium',
    },
  },
});
