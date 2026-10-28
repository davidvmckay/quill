# Quill — internally maintained fork

This repository maintains Quill 2 for internal use, including security fixes,
HTML export fidelity, and keyboard accessibility improvements. It is independent
of the upstream repository's CI and public release process.

The library is one package, with one root dependency list, lockfile, and
`node_modules`. Its source lives in `src/`, with the Parchment model in
`src/parchment/` and Delta operations in `src/delta/`.

## Use

```javascript
import Quill from 'quill';
import Core from 'quill/core';
import { Registry, InlineBlot } from 'quill/parchment';
import Delta from 'quill/delta';
import Bold from 'quill/formats/bold';
import 'quill/dist/quill.snow.css';
```

Choose the imports your application needs. A Parchment-only import has no editor
or Delta dependency. A Delta-only import has no editor or Parchment dependency.
ES modules preserve component boundaries, and package side-effect metadata keeps
CSS and editor initialization while allowing unused components to be omitted.

The legacy standalone browser assets remain available under `quill/dist/`.

## Build

Install Bun 1.4.3 or newer, then run:

```sh
bun install --frozen-lockfile
bun run build
bun pm pack --destination .bun
```

The build writes JavaScript modules, declarations, browser bundles, CSS, and
licenses to `dist/`. The local archive contains one `quill` package with all three
components and their public entry points. Distribute that archive through your
internal mechanism; packing does not publish it.

## Develop and verify

```sh
bunx --bun playwright install firefox
bun start
bun run verify
```

Chrome/Chromium supplies Bun.WebView's browser backend; macOS also supplies
native WebKit. Firefox uses Playwright as its driver. All tests use `bun test`,
and `bun run typecheck` uses Bun's built-in checker.

Maintained source and build/test tools use TypeScript. The optional documentation
site and its playgrounds also use TypeScript/TSX with strict Bun checks; generated
browser JavaScript and documentation code snippets remain JavaScript.

The development editor runs at `http://127.0.0.1:9080`. See
[development instructions](.github/DEVELOPMENT.md) for targeted tests, security
checks, accessibility behavior, and the optional documentation website.

## Editor options

To let Tab and Shift+Tab move focus out of an editor in a form:

```javascript
const quill = new Quill("#editor", {
  theme: "snow",
  modules: { keyboard: { tabBehavior: "navigate" } },
});
```

The default remains `'indent'` for compatibility. Toolbar dropdowns support arrow
keys, Home/End, Enter/Space, Escape, and typeahead.

## Credits and license

Quill was created by Jason Chen and Byron Milligan and developed by Slab and the
Quill community. This fork retains the BSD 3-clause license. See [LICENSE](LICENSE)
and [changes](CHANGELOG.md).
