# Internal development

This repository is an independently maintained Quill 2 fork. Bun 1.4.3 or newer
runs the library build, development server, lint, type checks, and browser tests.
Inherited GitHub CI and public npm release automation have been removed.

## Setup

```sh
bun install --frozen-lockfile
bunx --bun playwright install chromium firefox webkit
```

`bun.lock` is the dependency lockfile. Commit updates to it alongside dependency
changes. TypeScript is retained for declarations and type checking and executes
under Bun; a separate Node.js installation is not required for the library tools.

## Build and internal distribution

```sh
bun run build
```

The complete distribution is written to `packages/quill/dist/`:

- `quill.js`, `core.js`, and individual modules preserve ESM and deep imports.
- Matching `.d.ts` files provide TypeScript declarations.
- `dist/quill.js` and `dist/quill.core.js` are standalone browser/UMD bundles.
- `dist/quill.core.css`, `dist/quill.snow.css`, and `dist/quill.bubble.css` are stylesheets.
- README, license, assets, and package metadata accompany the build.

Consume this directory through your internal distribution mechanism. The build
never publishes a package, changes a version, pushes Git, or calls upstream.

## Development and verification

```sh
bun start                  # editor at http://127.0.0.1:9080; refresh after edits
bun run lint
bun run test:unit          # Chromium, headless
bun run test:e2e            # Chromium, Firefox, WebKit against the Bun server
bun run test:security       # source and compiled distribution regressions
bun run verify             # build, lint, all three unit browsers, fuzz, E2E
```

To run individual tests or another unit browser:

```sh
bun run test:unit ui/picker.spec.ts
BROWSER=firefox bun run test:unit
bun run --cwd packages/quill test:unit:watch
```

The test server uses local assets and highlight.js, so it needs no CDN access.
Browser installation and dependency installation require network access. Local
browser tests and the development server need permission to launch browsers and
listen on localhost.

The Playwright command sets `PW_DISABLE_TS_ESM=1` because Bun natively loads
TypeScript; Playwright's Node-specific ESM loader is unnecessary under Bun.

## Editor behavior

HTML exports retain normal spaces. Significant whitespace is represented with
`white-space: pre-wrap`, and Quill clipboard import honors this style. Store a
Delta for lossless editing of formula/video embeds, whose HTML exports remain
readable text/link fallbacks.

Toolbar pickers expose named listboxes with selected options and support arrow
keys, Home/End, typeahead, Enter/Space selection, Escape, and Tab. Existing picker
CSS classes are preserved; accessible option roles change from `button` to `option`.
Caller-provided labels are honored.

Set `modules.keyboard.tabBehavior` to `'navigate'` to let Tab and Shift+Tab leave
the editor normally. The default `'indent'` preserves existing Tab behavior.

## Optional documentation website

`packages/website` is the inherited Next.js documentation site. It is excluded
from the default library build and verification. Its Next.js build pipeline still
uses Webpack internally. It can be run separately with `bun run start:website` or
built with `bun run build:website`; site modernization is separate from the Bun
library build.
