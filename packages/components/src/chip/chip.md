---
category: status
---

# Chip

A word in a pill: a state, a date, a goal. Its words are its meaning; the colour only repeats them.

## Tones

A plain chip is quiet words on a sunken pill with a hairline ring. `Go` is on track, in the accent; `Warn` is a warning the row carries, such as a task due today, in amber; `Blocked` is urgent, such as an overdue task, in red. Each prints on a soft ground of its colour. `Done` is quieter still. A `glyph` leads the words, a flag on a due date. `isBusy` adds a spinner while the work runs (polling, building, starting), and the chip says it is busy.

::Example{name="tones"}

## Flat, large and counted

`isFlat` drops the pill, for a date or a count in a row's meta that need not stand out. `isLarge` is taller, for a strip of goals under a page's head: each leads with its goal's dot (`marker`), ends in a quiet `count`, and with `href` is a link to the goal. A linked chip is named with its count after a pause: "Ship the beta, 2".

::Example{name="goals"}

## Dots

`Chip.dotView` is the chip as a small dot in its tone, where a word would take the room a title needs, such as a task row's status before its title. It is an image named by its word, and the application's Tips shows the word as its tip, so the state never rests on its colour.

::Example{name="dots"}
