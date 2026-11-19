---
category: overlays
---

# Menu

A printed slip under its toggle. Its rows take focus: the first as it opens, or the last on ↑; ↑ and ↓ move and wrap, Home and End go to the ends, and a letter goes to the row it starts. Enter, Space or a click picks a row and the slip closes; Escape or Tab closes it and puts focus back on the toggle.

## Rows in groups

Radio rows say which is checked, and the checked one prints in the accent with a check at its end; the parent moves the check. A group's heading is a quiet label row. A check row toggles in place, so the slip stays open. A link row is a real link, so a new tab can open it. A row that cannot run prints muted, and the arrows still stop on it, so its name is read.

::Example{name="settings"}

## Actions and a composed toggle

An action row can print the key that does the same; here n makes a task, except while a slip is open. A toggle can carry its own content in place of its words: a glyph, the current choice, a count and a caret, here on the page's primary button. Its `variant` is a button's (`Primary`, `Ghost`, `Quiet` for a side pane's property), or `Chip`, which prints a chip with a caret, as an Inbox card's area and goal do.

::Example{name="create"}

## Glyphs, hints and separators

An item can lead with a glyph and end in a quiet hint, such as the date a choice means. The checked choice prints in the accent with a check in place of its hint. A separator is a rule the arrows pass over. A day row (`Menu.day`) opens the browser's date picker as the slip closes, over a hidden date input beside the toggle, and the day picked comes back as `PickedDay`, with focus on the toggle. The input mounts `Menu.BindDayInput`, a name of its own rather than a PropsList date's `BindDatePicker`, since a Scene tells Mounts apart by name and order: resolve it by name with `Menu.Message.CompletedBindDayInput`.

::Example{name="when"}

## A menu per row

Each row's more menu is a muted glyph toggle with its own Model and id, never one Model handed from row to row. It hangs from the toggle's end edge.

::Example{name="row-actions"}
