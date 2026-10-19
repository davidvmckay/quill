# Internal development

This repository is an independently maintained Quill 2 fork. Bun 1.4.3 or newer
runs the library build, development server, type checks, and tests.
Inherited GitHub CI and public npm release automation have been removed.

## Setup

```sh
bun install --frozen-lockfile
bunx --bun playwright install firefox
```

`bun.lock` is the dependency lockfile. Commit updates to it alongside dependency
changes. `bun check` provides the built-in TypeScript checker. The TypeScript
package is used solely to emit `.d.ts` files; it executes under Bun. ESLint,
Prettier, and Vitest are removed.

Chrome/Chromium must be installed for Bun.WebView; `BUN_CHROME_PATH` can select its
executable. On macOS, Bun.WebView also uses the system WebKit. Firefox uses the
Playwright browser driver, with `bun test` providing the test harness.

## Build and internal distribution

```sh
bun run build
```

The editor distribution is written to `packages/quill/dist/`. The internal Delta
package is written to `packages/quill-delta/dist/`. Distribute both directories
through the internal package mechanism: the editor pins `quill-delta` to
`5.1.0-internal.1`, preventing a fallback to the public Lodash-based Delta package.

The editor distribution contains:

- `quill.js`, `core.js`, and individual modules preserve ESM and deep imports.
- Matching `.d.ts` files provide TypeScript declarations.
- `dist/quill.js` and `dist/quill.core.js` are standalone browser/UMD bundles.
- `dist/quill.core.css`, `dist/quill.snow.css`, and `dist/quill.bubble.css` are stylesheets.
- README, license, assets, and package metadata accompany the build.

JavaScript and CSS bundles use Bun's native bundler. Edit the plain CSS files in
`packages/quill/src/assets/`: `core.css` defines editor layout and lists,
`base.css` shares theme controls, and `snow.css`/`bubble.css` import their toolbar
and tooltip styles. Shared control colors use CSS custom properties. Bun resolves
these imports and minifies each distribution stylesheet into a standalone file;
the source stylesheets are also included in `dist/assets/`.

Consume this directory through your internal distribution mechanism. The build
never publishes a package, changes a version, pushes Git, or calls upstream.

## Development and verification

```sh
bun start                  # editor at http://127.0.0.1:9080; refresh after edits
bun run typecheck
bun run test:unit           # bun:test with jsdom; document operations
bun run test:e2e            # Chrome through Bun.WebView
BROWSER=firefox bun run test:e2e
BROWSER=webkit bun run test:e2e  # macOS system WebKit
bun run test:security       # source and compiled distribution regressions
bun run verify             # build, Bun checks, units, fuzz, all available browser backends
```

To run individual tests:

```sh
bun run test:unit ui/picker.spec.ts
BROWSER=firefox bun run test:e2e distribution.spec.ts
bun run --cwd packages/quill test:unit:watch
```

The test server uses local assets and highlight.js, so it needs no CDN access.
Browser installation and dependency installation require network access. Local
browser tests and the development server need permission to launch browsers and
listen on localhost.

Bun owns discovery, lifecycle, assertions, watch mode, and reporting. Browser
selection is `BROWSER=chromium` (the default), `firefox`, or `webkit`. Native
WebKit requires macOS; verification skips that backend on other platforms. IME
cases require Chrome's CDP input commands and are explicitly skipped elsewhere.
Native clipboard paste is checked in Chrome and Firefox; Bun.WebView's WebKit
backend cannot perform it, so that one case is explicitly skipped on WebKit.
Geometry and scrolling cases run in real browsers rather than jsdom. Unit tests
mock automatic scrolling and supply jsdom's missing code-block `innerText` getter.

`src/utils/object.ts` owns the clone, merge, and equality policies, adapted from
m-dash where applicable. Config merges preserve callbacks and opaque instances,
merge arrays by index, ignore undefined overrides, and protect prototype keys.
The local Delta 5.1.0 adaptation reuses these helpers; its original BSD license is
preserved. The editor and Delta runtime dependency graph contains no Lodash.

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

`packages/website` is the inherited Next.js documentation site. It has a separate
dependency installation and is excluded from the library workspaces, lockfile,
build, and verification. Run `bun install --cwd packages/website` before using it.
Its Next.js build pipeline still
uses Webpack internally. It can be run separately with `bun run start:website` or
built with `bun run build:website`; site modernization is separate from the Bun
library build.
