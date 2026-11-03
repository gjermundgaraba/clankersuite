---
order: 4
---

# Space and lines

Whole pixels throughout. A component picks a step; a brand that changes a step changes every component on it.

## Lines

A container takes a 2px ink border, a divider a 1px rule, a ring 3px.

::Tokens{prefix="--semantic-dimension-border-width"}

## Corners

`control` rounds what is pressed or typed into; `surface` rounds what contains. Both are 0 in clankersuite: every corner is square.

::Tokens{prefix="--semantic-dimension-radius"}

## Sizes

The fixed sizes of things: controls, rows, glyphs, bars and rails, and the widths and measures that hold text.

::Tokens{prefix="--semantic-dimension-size"}

## Padding and gaps

`padding-*` and `gap-*` are ladders from `xxx-small` to `xxx-large`. `control-padding-*` is the inside of a control: its row height is its line plus its padding plus its border, so these steps are a pixel apart and some are odd, to keep a bordered control on the row height.

::Tokens{prefix="--semantic-dimension-space"}

## Travel

How far a thing moves: a pressed button into its shadow, an entering toast, a glyph nudged onto the baseline.

::Tokens{prefix="--semantic-dimension-travel"}
