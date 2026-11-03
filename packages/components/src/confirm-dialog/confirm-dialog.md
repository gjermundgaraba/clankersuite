---
category: overlays
---

# Confirm dialog

The one question before an irreversible step: a glyph in a box, a headline, a sentence. The thing that destroys (delete, disable, reset) is a neutral button at rest that opens it; the red button is only the commit inside it.

## Destructive

With `isDanger`, focus starts on cancel, the dialog is an alert, and h and l, or ← and →, move between the actions. The confirm stays open while its work runs: the red button prints the working cursor, and cancel, Escape and the veil are held. It closes when the work lands; a failure keeps it open, with the reason under the sentence.

::Example{name="delete"}

## Not destructive

Without `isDanger`, the confirming button is primary, focus starts on it, and the dialog is a plain one. `isDisabled` holds the confirming button while the action cannot run, and cancel stays live.
