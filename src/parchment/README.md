# Parchment component

This directory contains the complete TypeScript source from Parchment 3.0.0,
originally distributed with Quill. The original BSD 3-clause license is preserved
in `licenses/parchment-LICENSE` at the repository root. Type-only declarations preserve upstream class-field behavior
under Bun, and a definite-assignment annotation replaces an obsolete suppression.
The editor behavior remains unchanged.

Parchment maintains Quill's document tree alongside the DOM. Blots represent
text, embeds, inline formatting, blocks, and the root scroll. Attributors apply
formatting through HTML attributes, classes, or styles. A registry connects DOM
nodes and registered formats to their blot implementations. A linked list stores
ordered blot children, and mutation handling keeps the model synchronized with
browser edits.

This component has no external runtime dependencies. Consumers import it from
`quill/parchment`; that entry point does not load the editor or Delta. The root
Bun build and type checks cover this directory as part of the single Quill
package.
