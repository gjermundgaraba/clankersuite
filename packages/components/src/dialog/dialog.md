---
category: overlays
---

# Dialog

A modal on the ink veil, holding one Card. Use it for a short task the reader finishes or abandons before going on: a rename, a setting, a form too small for its own page.

## A form in a dialog

The dialog hands its content attribute groups: `title` names it, `initialFocus` takes focus as it opens, `closeButton` closes it, and `actionBar` lets h and l, or ← and →, move between the actions. Escape or a press on the veil closes it, and focus returns to the button that opened it.

While the save runs, the dialog's ways out are held: the close glyph and cancel are held, and the update passes `isCloseHeld`, so Escape and the veil change nothing either. A name with a slash is refused, the reason lands on the field, and the dialog is free again. The rename is said through the live region once it lands.

::Example{name="rename"}

## The live region

An open dialog makes the page outside it inert and hidden from screen readers, so the page's live region and toasts render inside the topmost open dialog. `LiveRegion.place` decides where on every render, from the dialogs the application holds: hand `toDialogView` to each dialog's `toLiveRegionView`, and put `toPageView` at the end of the body.
