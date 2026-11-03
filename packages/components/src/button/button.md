---
category: actions
---

# Button

A command the reader gives: pixel caps in an ink box on a print shadow. `Primary` is the one action that commits; `Danger` is only the commit inside a confirm, never a button at rest.

::Example{name="variants"}

## Small

The small size for row tools, panel bars and anything set among text.

::Example{name="small"}

## Default

The action Enter takes in a card wears a double ring instead of the print shadow.

::Example{name="default-ring"}

## Danger

Danger prints in red ink on a red shadow, and only as the commit inside the confirm that a destructive action opens. A destructive action at rest is a neutral button that opens a danger `ConfirmDialog`.

::Example{name="danger"}

## With a key hint

The key that does the same prints small after the button's words, in the reader's platform's symbols.

::Example{name="key-hint"}

## Busy

While its work runs, a button is held and prints a blinking cursor in its padding, so it keeps its width. It stays focusable and says it is busy.

::Example{name="busy"}

Each pair is the same button at rest, then busy, at both sizes: neither moves.

::Example{name="busy-width"}

## Disabled

A disabled button stays focusable, so Tab still finds it, but it has no click handler. A held submit button renders `type="button"`, so it submits nothing.
