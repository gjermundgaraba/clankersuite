---
category: data
---

# Rows

A list of 34px rows, each a glyph, its text, a slot on the right and its tools. The text takes the free width and ellipsises.

## Selectable

A box at each row's left edge, its state in the application's Model. The row's text is the box's label, so a press anywhere on the text toggles it.

::Example{name="select"}

## Outline

`isOutline` indents nested rows on a rule guide. With `isTreegrid` the list is a keyboard treegrid whose cursor the application moves: ↑ and ↓ move the cursor, → and ← unfold and fold, Home and End go to the first and last row. A row printed only to keep a match on its chain, here Minutes, is muted as context.

::Example{name="outline"}

## Rows that are links

With `isLink`, the row's whole box is the target of the one link in its text, while its own controls stay their own. A status dot stands before each title, the row whose link is `aria-current` prints inverted, and its menu is its own.

::Example{name="links"}
