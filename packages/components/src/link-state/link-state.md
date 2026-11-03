---
category: navigation
---

# Link state

The connection word, in a top bar or a status bar. It is a status (`role="status"`), so a change of state is read out.

## States

`Online` is quiet. `Connecting`, the first reach, is muted and prints the working cursor. `Reconnecting`, the link dropped and coming back, is on amber with the cursor. `Offline`, given up, is on red. Every state stays visible on a phone.

::Example{name="states"}

## Its words

The words are the state's name unless `label` gives others.

::Example{name="label"}
