# Internal Quill Delta

This package adapts the four source modules from `quill-delta` 5.1.0. Its original
BSD 3-clause license is preserved in `LICENSE`. Clone and equality operations use
Quill's shared object utilities, removing the upstream Lodash dependencies.

`bun check` checks types. `bun run build` bundles JavaScript with Bun and emits
declarations with TypeScript into `dist/`. Distribute that directory alongside
`packages/quill/dist/` using the exact internal version pinned by the editor.
