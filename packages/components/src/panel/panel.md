---
category: layout
---

# Panel

The unit of the system: paper in a 2px ink box on a 5px print shadow, under an inverted title bar. It is a region landmark named by its `h2` title, or by `name` where its title repeats among its siblings.

## Title, meta, actions, body and foot

A count or state sits at the title bar's right, then small Buttons and IconButtons, which print in paper on the ink bar. The foot is a ruled line under the body: a note in `foot`, then the buttons in `footActions`, pushed right.

::Example{name="parts"}

## Shelf and a flush body

A shelf is a strip on the head tint between the title bar and the body, for a field that picks what the body shows. A flush body sits edge to edge, for places, rows, tables and meters.

::Example{name="shelf"}

## Its id

The id must be unique in the document: the title's id is made from it. It is the panel's key too, so a panel among siblings that come and go keeps its own element. To keep an element across states, render one panel under one id.
