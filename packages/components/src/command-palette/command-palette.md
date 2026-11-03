---
category: overlays
---

# Command palette

Type to find a command or a title, and run it. It hangs near the top of the window, and opens from a button or its key (here Mod+K: ⌘K on Apple, Ctrl+K elsewhere).

## Commands, pages and titles

One inverted cursor row moves with ↑ and ↓ only, stopping at the ends; the pointer shades a row but never moves the cursor. Enter or a click runs it, and the palette closes first, so what the command opens takes focus. A held command is still found and the cursor lands on it, with its reason in place of its hint. Authored titles, set in sans with a glyph, wait for a query; a query finds a row by its label's letters in order, or by every word somewhere in its label or keywords (try "seeds").

A command with a page opens it in place: Back, or Backspace in an empty field, returns to the commands as they were. The choice in force is tagged current. A picked choice holds the page while it applies. Archive refuses: a notice in the palette says why, and a toast says so above it, because while the palette is open the page's live region and toasts render inside it. The status button opens the palette straight on its page, and Back still leads to the commands.

::Example{name="palette"}

## In an application

Snapshot what the commands act on as the palette opens, and build `commands` from that snapshot until it closes. Lift `CommandPalette.subscriptions` once per palette, so the keys pressed straight after the one that opened it are not lost, and pause the page's own keys while it is open.
