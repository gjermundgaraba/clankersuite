---
category: data
---

# Props list

A thing's properties, one 36px row each: a label, the value and its controls. `isCode` prints a value as code, for a key, an id or a path. `isFlat` drops the rules and sets the labels quiet in a narrow column of their own, for a side pane's properties, whose values are quiet buttons that open menus; the side pane's page shows one. There a date is `PropsList.dateView`, a quiet button that prints the day as the application writes it ("Fri 2 Jan"), or "None", and opens the browser's date picker; the update its `onChange` sends puts focus back on the button (`${id}-button`) with a `Focus` Command. A word such as who a task is owed to is a quiet button the application swaps for an InlineInput, which lines up with the button's words.

Put it in a padded Panel, not a flush one: its rows have no inline padding of their own, so in a flush panel the labels would touch the panel's edge.

::Example{name="properties"}
