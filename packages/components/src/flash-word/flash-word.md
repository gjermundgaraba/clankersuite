---
category: status
---

# Flash word

A word printed beside an action for a moment, such as `copied` or `saved`: the outcome of the control the reader just used, beside it. An outcome they may not be looking at is a toast.

## Saved

Press save: the word prints, and goes after a moment. It is a polite status, always on the page so the word is heard when it arrives; empty, it takes no room.

::Example{name="saved"}

## The word lives in the Model

The word and its clearing live in the application's Model. Set the word together with a Command that waits `FlashWord.HOLD` and reports back, and clear it when that Message arrives, unless a newer word has replaced it since: keep a count, and drop a wait whose count is not the latest.
