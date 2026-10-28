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

The library has one root `package.json`, dependency installation, and lockfile.
`src/` owns editor modules, formats, themes, and CSS; `src/parchment/` owns the
DOM-backed document model; `src/delta/` owns document/edit operations. Shared
object utilities live in `src/utils/`. There are no Parchment or Delta workspace
packages or dependencies.

`bun run build` emits the complete module tree into root `dist/`. The root
package's `exports` map exposes:

- `quill`: the full editor and its standard registrations.
- `quill/core`: the core editor for applications choosing their own formats/modules.
- `quill/parchment`: the standalone document model and registry.
- `quill/delta`: standalone document/edit operations.
- `quill/formats/*`, `quill/modules/*`, and other deep module imports, with optional `.js` extensions.
- `quill/dist/*`: standalone browser bundles and core/Snow/Bubble CSS.
- `quill/assets/*`: source stylesheets and SVG assets.

Each JavaScript entry has matching declarations. Internal imports are relative
ES modules, so the full editor and component entry points share the same class
constructors and registries. Parchment has no dependency on the editor, Delta,
`fast-diff`, or `eventemitter3`; Delta depends only on shared object utilities and
`fast-diff`. Consumer bundlers can include only the component they import.

The `sideEffects` list preserves stylesheets, editor registrations, browser
bundles, and the emitter's document event handlers. Other modules can be dropped
when unused. This metadata does not combine the component entry points into one
barrel module.

JavaScript and CSS use Bun's native bundler/transpiler. Edit plain CSS in
`src/assets/`: `core.css` defines layout/lists, `base.css` shares theme controls,
and `snow.css`/`bubble.css` import their toolbar and tooltip styles. Distribution
stylesheets are standalone; source stylesheets are copied to `dist/assets/`.
Original Parchment and Delta BSD licenses are retained under `licenses/` and in
`dist/licenses/` alongside the browser assets.

To produce the single internal package archive after building:

```sh
bun pm pack --destination .bun
```

The `files` allowlist includes compiled modules/assets, declarations, documentation,
and licenses. Consumers install that one archive and use its subpath exports.
The build and packing commands do not publish, push Git, or call upstream.

## Development and verification

```sh
bun start                  # editor at http://127.0.0.1:9080; refresh after edits
bun run typecheck
bun run test:unit           # bun:test with jsdom; document operations
bun run test:e2e            # Chrome through Bun.WebView
BROWSER=firefox bun run test:e2e
BROWSER=webkit bun run test:e2e  # macOS system WebKit
bun run test:security       # source and compiled distribution regressions
bun run test:package       # independent consumer bundles, CSS retention, and declarations
bun run verify             # build, Bun checks, consumer checks, units, fuzz, browser backends
```

To run individual tests:

```sh
bun run test:unit ui/picker.spec.ts
BROWSER=firefox bun run test:e2e distribution.spec.ts
bun run test:unit:watch
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
Type checks cover the complete source tree, strict Parchment/Delta settings, and
build tools. `bun start` watches all of `src/`. The browser module fixture uses
the public package exports and checks shared registry/blot/Delta class identities.
`bun run test:package` builds independent Parchment, Delta, core, and CSS consumers,
checks bundle input graphs for unwanted components, and checks declarations from
an external consumer directory without source aliases.

`src/utils/object.ts` owns the clone, merge, and equality policies, adapted from
m-dash where applicable. Config merges preserve callbacks and opaque instances,
merge arrays by index, ignore undefined overrides, and protect prototype keys.
The local Delta 5.1.0 adaptation reuses these helpers. Parchment's complete 3.0.0
TypeScript source is included without behavior changes and has no external
runtime dependencies. Both components retain their original BSD licenses. The
editor runtime dependency graph contains no Lodash; its remaining external
runtime packages are `eventemitter3` and Delta's `fast-diff`.

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
dependency installation and is excluded from the library dependency installation, lockfile,
build, and verification. Its application, configuration, utilities, and interactive
playgrounds are TypeScript/TSX, with a separate strict `bun check` configuration.

```sh
bun run build                         # public declarations used by the website
bun install --cwd packages/website --frozen-lockfile
bun run typecheck:website
bun run test:website                   # helpers, shared edits, and playground compilation
bun run --cwd packages/website test:browser  # four examples in Chrome via Bun.WebView
bun run start:website
bun run build:website
bun run --cwd packages/website serve   # serve the static export at http://127.0.0.1:9000
```

The site retains Next.js 14 and its Webpack pipeline. A Bun launcher compiles the
maintained `next.config.ts` to a temporary `.mjs` config that Next can load, then
removes it on exit. Production builds run Bun's checker first; Next's redundant
TypeScript check is disabled. Browser bundles and static exports still contain
generated JavaScript. JavaScript examples embedded in documentation remain content.
