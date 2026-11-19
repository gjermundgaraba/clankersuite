---
category: layout
---

# Card

The floating surface: a rounded box on a soft shadow, under a ruled title bar, over a sunken foot. A dialog holds one as its sheet, and so does a screen that stops the reader, such as a sign-in.

## A card

The title bar takes a title and a meta line. The foot is a strip on the sunken ground: `keyNotes` print the keys worth knowing at its left, each in its keycap, `lead` puts something after them, and the actions are pushed right, the committing one `Primary`. `isNarrow` makes the card narrower, for confirms, settings and sign-in. Without a `title` there is no title bar, and `head` puts a line across the card's top, such as a Field in its `Sheet` look, as a quick capture has.

::Example{name="surface"}

## A form card

`Card.formView` is a card that is a form, named by its title: its fields in one group, then cancel and the primary submit in the action bar. The submit is held while there is nothing to send. While it sends, the submit prints a spinner and the fields are held, so nothing changes under the send and nothing sends twice; the update moves focus to the submit button, `Card.submitId`, as it sends. `notices` go above the fields and stay live.

::Example{name="form"}
