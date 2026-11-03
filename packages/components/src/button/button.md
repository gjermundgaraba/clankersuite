---
category: actions
---

# Button

A command the reader gives: pixel caps in an ink box on a print shadow. `Primary` is the one action that commits; `Danger` is only the commit inside a confirm, never a button at rest.

::Example{name="variants"}

## Busy

While its work runs, a button is held and prints a blinking cursor in its padding, so it keeps its width. It stays focusable and says it is busy.

::Example{name="busy"}

## Disabled

A disabled button stays focusable, so Tab still finds it, but it has no click handler. A held submit button renders `type="button"`, so it submits nothing.
