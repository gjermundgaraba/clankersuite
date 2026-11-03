---
category: actions
---

# Copy button

Copies text to the clipboard and says so: a quiet icon button whose copy glyph turns to a check for a beat, while the page's live region says "Copied." A failed copy is said too.

It writes through Effect's `Clipboard` port, which the application provides: put `Clipboard.layer` from `@effect/platform-browser` in its `resources`, and place the live region with `LiveRegion.place`.

::Example{name="copy-link"}
