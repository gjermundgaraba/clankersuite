---
category: layout
---

# Goal card

A goal on a card, as a goals page lists them: a ring in its colour that fills by the share of its outcomes done, its title with its area's Chip at the right, why it exists, its outcomes as steps, each filling in its colour once that outcome is done, with a quiet line that says them, then two columns under quiet headings, such as its outcomes as Choices, struck through once done, and the tasks moving it as compact Rows in small text. Outcomes that carry their own tools (rename, move, remove) can sit in Rows, which the column draws flush, one Choice tall. `steps` takes the outcomes in order, each with its `label` and `isDone`. `description` takes markup, such as a MarkdownEditor's `readView`, and `actions` sets quiet buttons after the chip, for what is done to the goal (Edit, Archive), which show while the pointer is on the card or focus is in it, and always on a touch screen. It is an `article` named by its title, on the surface in a hairline ring. `GoalCard.valuesView` sets what the goals serve on the sunken ground above them, under its quiet label: a sentence, or a MarkdownEditor with its label hidden, edited where it is read.

::Example{name="goals"}
