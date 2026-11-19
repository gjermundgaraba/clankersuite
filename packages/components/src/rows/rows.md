---
category: data
---

# Rows

A list of 36px rows on no box, each rounded and tinted under the pointer: a check or a glyph, its text, a slot on the right and its tools. The text takes the free width and ellipsises.

## Tasks

`checkView` is a round check in the glyph slot, named by the row's title, that fills with the accent and pops as it is checked. `contextView` prints where the row belongs in a quiet line under its title: its area's square, the task it sits under after a `›`, and the goals it serves after a `·`. The slot holds only what matters, chips for a due or overdue day; where the pointer can hover, the row's tools, quiet IconButtons, take the slot's place while the row is hovered, holds focus or is the cursor, and Tab still reaches them while they are unseen. The row whose task is open is the cursor, tinted.

::Example{name="tasks"}

## Groups

`sectionView` heads a group of rows with a plain line, an optional glyph or area square, its title and a quiet count, with no box and no rule; groups stand apart by space alone. It is a section named by its `h2`; a list's first group, the page's own rows, goes without a heading. `addView` is the quiet row after the rows that adds one, with an `id` the application puts focus back on once the field it swapped in ends, and `doneView` the line under a list that says what was finished.

## Selectable

A box at each row's left edge, its state in the application's Model. The row's text is the box's label, so a press anywhere on the text toggles it.

::Example{name="select"}

## Outline

`isOutline` indents nested rows 28px, and a row's `fold`, a `toggleView` chevron, hangs outside its left edge. With `isTreegrid` the list is a keyboard treegrid whose cursor the application moves: ↑ and ↓ move the cursor, → and ← unfold and fold, Home and End go to the first and last row. A row printed only to keep a match on its chain, here File the minutes, is muted as context.

::Example{name="outline"}

## Rows that are links

With `isLink`, the row's whole box is the target of the one link in its text, while its own controls stay their own. A status dot stands before each title, the row whose link is `aria-current` is tinted, and its menu is its own.

::Example{name="links"}
