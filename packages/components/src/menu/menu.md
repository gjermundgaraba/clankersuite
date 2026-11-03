---
category: overlays
---

# Menu

A printed slip under its toggle. Its rows take focus: the first as it opens, or the last on ↑; ↑ and ↓ move and wrap, Home and End go to the ends, and a letter goes to the row it starts. Enter, Space or a click picks a row and the slip closes; Escape or Tab closes it and puts focus back on the toggle.

## Rows in groups

Radio rows say which is checked and print it inverted; the parent moves the check. A check row toggles in place, so the slip stays open. A link row is a real link, so a new tab can open it. A row that cannot run prints muted, and the arrows still stop on it, so its name is read.

::Example{name="settings"}

## Actions and a composed toggle

An action row can print the key that does the same; here n makes a task, except while a slip is open. A toggle can carry its own content in place of its words: a glyph, the current choice, a count and a caret, here on the page's primary button.

::Example{name="create"}

## A menu per row

Each row's more menu is a muted glyph toggle with its own Model and id, never one Model handed from row to row. It hangs from the toggle's end edge.

::Example{name="row-actions"}
