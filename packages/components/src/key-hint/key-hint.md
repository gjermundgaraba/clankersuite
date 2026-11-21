---
category: text
---

# Key hint

A key printed small beside the words of a control, for the eye only: the control's accessible name stays its words.

## Printed for your keyboard

A hint takes the same keys `Dom.streamFromKeyBindings` matches and prints them as their keycaps read. `Mod+K` prints `⌘K` on Apple and `Ctrl+K` elsewhere; arrows print as arrows; Enter prints `↵` on Apple; a letter prints in upper case, Shift is spelled out before a letter (`Shift+G` is `⇧G` on Apple and `Shift+G` elsewhere), and Shift with a lone symbol prints the symbol it types (`Shift+?` is `?`). The presses of a sequence print a space apart: `["G", "I"]` is `G I`.

The key platform lives in the application's Model: `KeyHint.detectKeyPlatform` reads it from the browser as the application starts, and components take it as `platform`. A Button, an IconButton or a menu row takes a `keyHint` and prints it the same way.

::Example{name="hints"}
