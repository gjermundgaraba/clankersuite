---
category: status
---

# Toast

Printed slips at the bottom right, across the bottom on a phone, for an outcome the reader may not be looking at. The outcome of the control they just used goes beside it as a flash word.

## Tones

Each slip is said politely, once, as it is raised. Ok and quiet slips leave after the hold, which waits for the whole stack while the pointer or the keyboard is on it; an error stays until it is dismissed. Escape in the stack takes the newest.

::Example{name="tones"}

## Where the stack goes

Render the stack once, among the page's live parts: `LiveRegion.view` takes it beside the Announcer's region, and `LiveRegion.place` puts both at the end of the body. While a dialog is open the stack prints inside it, so a slip raised from the dialog shows above the veil and can be reached. The command palette's refused move shows this.
