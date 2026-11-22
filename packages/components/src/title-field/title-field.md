---
category: forms
---

# Title field

A title edited where it is printed: a bold headline that is its own field, so a task's title is never printed twice, once to read and once to edit. It wraps and grows as the headline would, and sits on a tint while it is hovered or focused. A plain Enter is done editing and never breaks the line; one that confirms an IME's composition, or comes with Shift, Ctrl, Alt or Cmd, is left alone. Enter is read by a Mount, `TitleField.BindTitleKeys`, whose lifecycle Message `toParentMessage` lifts; a Scene resolves it by name with that Message, never with `onEnter`. The Mount takes `onEnter` as the field mounts, so a field whose `onEnter` names another item takes another `id`. Its name is for screen readers, since the title labels itself. The Inbox card and a side pane's task print one.

::Example{name="task"}
