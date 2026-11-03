---
category: layout
---

# Card

The raised surface: paper in a 2px ink box on the 8px print shadow, under an inverted title bar. A dialog holds one, and so does a screen that stops the reader, such as a sign-in.

## A card

The title bar takes a title and a meta line. The action bar under a 2px ink rule pushes its actions right, the default one ringed, and `lead` puts something before the push. `isNarrow` makes the card 440px instead of 680px, for confirms, settings and sign-in.

::Example{name="surface"}

## A form card

`Card.formView` is a card that is a form, named by its title: its fields in one group, then cancel and the primary submit in the action bar. The submit is held while there is nothing to send. While it sends, the submit prints the working cursor and the fields are held, so nothing changes under the send and nothing sends twice; the update moves focus to the submit button, `Card.submitId`, as it sends. `notices` go above the fields and stay live.

::Example{name="form"}
