---
category: layout
---

# Window

A panel that lives on a stage or in a reel, sized by whatever places it: its body scrolls inside, and its title bar carries its kind, its state and its tools. It is a region landmark named by its title.

## Kind, state and tools

The glyph says what kind of thing it is, a chip in the title bar its state, and IconButtons its tools. With `onClose`, a close glyph prints after them.

::Example{name="machine"}

## Several tools

The tools sit in the bar in order, before the close. A child Submodel, whose view is one `Html`, hands back several in a `span.gg-window-tools`: it is no box of its own, so its buttons sit in the bar as the others do. Here the address field's label is hidden, and still names it for screen readers.

::Example{name="browser"}
