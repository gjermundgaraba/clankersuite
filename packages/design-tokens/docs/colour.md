---
order: 2
---

# Colour

Two palettes of one token set: paper, the light one, and plum, the dark one. Every semantic colour is a `light-dark()` pair, so it follows the `color-scheme` of the element that uses it; each row shows it in both palettes. The page follows the reader's system, and `data-color-scheme="light"` or `"dark"` on `<html>` pins one.

Use the `--semantic-*` tokens; each row says what its token is for. The `--primitive-*` tokens they point at may change or disappear in any release.

## Backgrounds

A `fill-*` colour fills a bounded shape; the others are grounds.

::Tokens{prefix="--semantic-color-background"}

## Borders

A divider is never the only cue for a control.

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

Opacities, each for one case.

::Tokens{prefix="--semantic-number-opacity"}
