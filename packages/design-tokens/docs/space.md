---
order: 4
---

# Space and lines

Whole pixels throughout, and spacing on a 4px rhythm. A component picks a step; a brand that changes a step changes every component on it.

## Lines

Every line, a border or a divider, is 1px; an accent line (a checked menu choice's bar, a drop marker, a focused field's baseline, a mixed check's bar) is 2px.

::Tokens{prefix="--semantic-dimension-border-width"}

## Corners

`control` rounds what is pressed or typed into; `surface` rounds what contains; `mark` rounds a checkbox.

::Tokens{prefix="--semantic-dimension-radius"}

## Sizes

The fixed sizes of things: controls, rows, glyphs, bars and rails, and the widths and measures that hold text.

::Tokens{prefix="--semantic-dimension-size"}

## Space

One scale on a 4px rhythm, from `xx-small` to `xx-large`. A gap, a padding or a margin takes a step. `inset` is the padding inside a surface's body and `gutter` the room between surfaces and at the page's edge; a brand can change either without moving the scale. `control-padding-*` is the inside of a control, `focus-ring-offset-*` how far a focus ring stands off its box, and `underline-offset` how far an underline sits below text.

::Tokens{prefix="--semantic-dimension-space"}

## Travel

How far a thing moves: an entering toast.

::Tokens{prefix="--semantic-dimension-travel"}
