---
category: forms
---

# Inline input

Text edited in place: an input that takes exactly the height of what it replaces, such as a row's title. Enter, or leaving the field with new text, reports `Committed`, and the field holds, still focused, until the application reports `succeeded` or `failed`. Escape discards the draft and ends. The field moves no focus itself: the application does when the edit ends by Enter or Escape.

`succeeded` takes the saved item's id when the save has one, as a new item does; a rename can report success without one. `Ended` carries the id of the last save that gave one, none when no save did.

## Adding several

A repeating field empties and stays open after each save from Enter, for the next. Add an item, then another; Escape ends and puts focus back on the button. An item already on the list is refused: the field keeps its text and says why under it.

::Example{name="add"}
