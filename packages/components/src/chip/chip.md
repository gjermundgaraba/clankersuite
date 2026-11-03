---
category: status
---

# Chip

A state word in a 2px box: draft, live, late. Its words are its meaning; the colour only repeats them.

## Tones

`Go` is active, in green. `Warn` is a warning the row carries, in amber. `Blocked` is a red outline. `Done` is tinted. Colour only ever means active, a warning, or urgent. `isBusy` adds the blinking block cursor while the work runs (polling, building, starting), and the chip says it is busy.

::Example{name="tones"}

## Dots

`Chip.dotView` is the chip as a 10px cell in its tone, where a word would take the room a title needs, such as a task row's status before its title. It is an image named by its word, and the application's Tips shows the word as its tip, so the state never rests on its colour.

::Example{name="dots"}
