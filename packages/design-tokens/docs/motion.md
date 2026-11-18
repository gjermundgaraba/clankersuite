---
order: 6
---

# Motion

A committed change tints the element and eases back over one beat; a card, a toast and the veil ease in; a busy control turns a spinner. Reduced motion swaps each for a still sign.

## Durations

::Tokens{prefix="--semantic-duration"}

## Arriving cards

A card eases up to full size from this scale.

::Tokens{prefix="--semantic-number-scale"}

## The flash

`Announcer.Flash` lays `--semantic-color-background-selected` over an element and eases it out over one beat of `--semantic-duration-flash`: the sign that a change was committed. Return it beside `Announcer.Announce`, which says what the flash shows. With reduced motion it holds the tint still for the beat instead.

::Example{name="flash"}

## The busy spinner

A busy control prints a ring that turns once every `--semantic-duration-spin`, `--semantic-dimension-size-spinner` across. With reduced motion it holds still.

::Example{name="busy-spinner"}
