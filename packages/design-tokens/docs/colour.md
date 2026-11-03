---
order: 2
---

# Colour

Two palettes of one token set: paper, the light one, and plum, the dark one. Every semantic colour is a `light-dark()` pair, so it follows the `color-scheme` of the element that uses it; each row shows it in both palettes. The page follows the reader's system, and `data-color-scheme="light"` or `"dark"` on `<html>` pins one.

Use the `--semantic-*` tokens. The `--primitive-*` tokens they point at may change or disappear in any release.

## Backgrounds

`canvas` is the page; `surface` is a panel, card, dialog or control; `head` is a title bar or a table head. `fill-*` fills a bounded shape: a button, a chip, a mark. `backdrop` and `dither` draw the veil and the dithered ground.

::Tokens{prefix="--semantic-color-background"}

## Borders

`primary` contains; `divider` divides, and is never the only cue for a control.

::Tokens{prefix="--semantic-color-border"}

## Text

`on-<fill>` is what reads on that fill. The `code-*` colours are the highlighter's, drawn from the `terminal-*` set.

::Tokens{prefix="--semantic-color-text"}

## Focus rings

The keyboard-focus indicator, whatever draws it.

::Tokens{prefix="--semantic-color-focus-ring"}

## Shadow inks

The colour of the print shadows on [Shadows and layers](/design-tokens/shadows).

::Tokens{prefix="--semantic-color-shadow"}

## Fades

Opacities: a muted or disabled thing on the inverse fill, a card being dragged, a key hint, a row's tools at rest.

::Tokens{prefix="--semantic-number-opacity"}
