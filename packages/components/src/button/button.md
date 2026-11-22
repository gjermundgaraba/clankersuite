---
category: actions
---

# Button

A command the reader gives: a word in a rounded box that shrinks a little while it is pressed. `Primary` is the one action that commits; `Ghost` has no box until it is hovered, for an action beside a page's title; `Quiet` is a value that opens a menu, at body size with its glyph quiet, as a side pane's properties print; `Danger` is only the commit inside a confirm, never a button at rest.

::Example{name="variants"}

## Small

The small size for row tools, panel bars and anything set among text.

::Example{name="small"}

## Large

The large size, taller and in body text, for the one action that ends a flow, such as a sheet's commit.

::Example{name="large"}

## Danger

Danger prints in red, and only as the commit inside the confirm that a destructive action opens. A destructive action at rest is a neutral button that opens a danger `ConfirmDialog`.

::Example{name="danger"}

## With a key hint

The key that does the same prints after the button's words as a keycap in a ringed box, in the reader's platform's symbols.

::Example{name="key-hint"}

## Busy

While its work runs, a button is held and a spinner turns in place of its words, which keep their room unseen, so it keeps its width. It stays focusable, its name is still read, and it says it is busy.

::Example{name="busy"}

Each pair is the same button at rest, then busy, at both sizes: neither moves.

::Example{name="busy-width"}

## Disabled

A disabled button stays focusable, so Tab still finds it, but it has no click handler. A held submit button renders `type="button"`, so it submits nothing.
