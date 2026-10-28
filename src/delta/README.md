# Delta component

This directory adapts the four source modules from `quill-delta` 5.1.0. Its original
BSD 3-clause license is preserved in `licenses/quill-delta-LICENSE` at the repository root. Clone and equality operations use
Quill's shared object utilities, removing the upstream Lodash dependencies.

Delta represents documents and changes as JSON operations: `insert` adds text or
embeds, `retain` keeps content and can change formatting, and `delete` removes
content. `Op` and `OpIterator` traverse operations; `AttributeMap` combines and
transforms formatting attributes. `Delta` supports diffing, composition,
inversion, and operational transformation for undo and collaborative editing.

Consumers import this component from `quill/delta`; it does not load the editor
or Parchment. The root Bun build and type checks cover it as part of the single
Quill package. Its remaining external runtime dependency is `fast-diff`.
