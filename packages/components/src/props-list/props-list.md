---
category: data
---

# Props list

A thing's properties, one 36px row each: a label, the value and its controls. `isCode` prints a value as code, for a key, an id or a path. `isFlat` drops the rules and sets the labels quiet in a narrow column of their own, for a side pane's properties, whose values are quiet buttons that open menus; the side pane's page shows one.

Put it in a padded Panel, not a flush one: its rows have no inline padding of their own, so in a flush panel the labels would touch the panel's edge.

::Example{name="properties"}
