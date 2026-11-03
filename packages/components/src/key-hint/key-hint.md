---
category: text
---

# Key hint

A key printed small beside the words of a control, for the eye only: the control's accessible name stays its words.

## Printed for your keyboard

A hint takes the same keys `Dom.streamFromKeyBindings` matches. `Mod+K` prints `⌘K` on Apple and `Ctrl+K` elsewhere; arrows print as arrows; a plain letter prints in lower case, and Shift with a lone character prints the character it types (`Shift+G` is `G`, `Shift+?` is `?`). A sequence of characters reads as Vim writes it: `["G", "G"]` is `gg`.

The key platform lives in the application's Model: `KeyHint.detectKeyPlatform` reads it from the browser as the application starts, and components take it as `platform`. A Button, an IconButton or a menu row takes a `keyHint` and prints it the same way.

::Example{name="hints"}
