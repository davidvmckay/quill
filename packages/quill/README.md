# Quill — internally maintained fork

This repository maintains Quill 2 for internal use, including security fixes,
HTML export fidelity, and keyboard accessibility improvements. It is independent
of the upstream repository's CI and public release process.

## Build

Install Bun 1.4.3 or newer, then run:

```sh
bun install --frozen-lockfile
bun run build
```

The distribution is in `packages/quill/dist/`. It includes JavaScript modules,
TypeScript declarations, standalone full/core browser bundles, and core/Snow/
Bubble CSS. Use the built directory through your internal distribution mechanism.

## Develop and verify

```sh
bunx --bun playwright install chromium firefox webkit
bun start
bun run verify
```

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
