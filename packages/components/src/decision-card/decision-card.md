---
category: layout
---

# Decision card

One item to decide on, as an inbox asks: where it came from in a quiet line, its title as a TitleField so it is edited where it is printed, its chips, then a row of four decision tiles, each a button with its glyph and keycap over its words, and the ways past it under them, such as a ghost Delete and Skip. It sits on the surface in a hairline ring, in the page's flow. Over it, `DecisionCard.progressView` says how far through the items the reader is: "1 of 5", a thin bar of the ones decided and how many are left, as a named `progressbar`.

Here each decision takes the item away and the next one comes up; the last leaves Inbox zero. The area and goal chips are Menu toggles (`variant: "Chip"`), and the items waiting under the card are dimmed Rows (`isDimmed`).

::Example{name="inbox"}
