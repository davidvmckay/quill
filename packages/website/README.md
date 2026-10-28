# Quill documentation website

This optional Next.js application has its own dependencies and Bun lockfile.
Its source, configuration, and playgrounds use TypeScript/TSX and strict Bun type
checking. Build the library first so the site can use its public declarations.

From the repository root:

```sh
bun run build
bun install --cwd packages/website --frozen-lockfile
bun run typecheck:website
bun run test:website
bun run --cwd packages/website test:browser
bun run start:website
bun run build:website
bun run --cwd packages/website serve
```

The development and static servers use port 9000 (`PORT` overrides it). Browser
checks require Chrome/Chromium; `BUN_CHROME_PATH` selects the executable.

Next.js 14 still uses Webpack internally. `scripts/next.ts` builds a temporary
`next.config.mjs` from the maintained TypeScript config and removes it when Next
exits. The production command runs `bun check` before Next. Generated `.next/`
and `out/` files contain browser JavaScript and are ignored by Git.

Playgrounds use Sandpack's `vanilla-ts` and `react-ts` templates. Documentation
code snippets remain JavaScript where that is the language being demonstrated.
