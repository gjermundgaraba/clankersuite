---
category: overlays
---

# Key help

The keyboard's help: every key in force, under its group, with a field that finds one by its keys or its words. Render it once per page.

## The keys this example answers to

j and k move through the items, and g g goes to the first. Press ? anywhere on the page, or the button, to open the help; the help adds its own `?` line. Keys wait while you type in a field, and the help says so.

::Example{name="key-help"}

## Describe the bindings once

Describe the keys as `KeyHelp.Binding`s: the keys that give each command, its group and what it does. Hand the same keys to `Dom.streamFromKeyBindings`, so a key never says one thing and does another, and bind `KeyHelp.HELP_KEYS` to `KeyHelp.open`. While the help is open the page's keys pause, and its live region renders inside it.
