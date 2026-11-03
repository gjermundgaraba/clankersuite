---
category: data
---

# Board

Columns of printed slips, one panel per column, for work that moves through stages. The cards are the application's: a drop reports `Moved`, and the application moves the item.

## Moving a card

A mouse drags a slip; a press that moves less than 5px stays a click. Touch and the keyboard take its grip: Space picks the card up, each arrow jumps it a column, Space drops it at the top of that column and Escape puts it back. Every step is said through the live region, and the card flashes where it lands. A press on a card's body selects it, and the selected card prints inverted. A column with nothing in it shows an empty state.

::Example{name="move"}

Lift `Board.subscriptions` into the application's, once per board, with a key prefix no other Subscription uses, or nothing follows the pointer or the keys.

## The card

`Board.cardView` prints one card from what the board hands it: the title, a two-line button when the card opens, over a meta row that ends in the grip. A press on a control in the meta row, such as the tag or the pencil, neither selects nor lifts the card. While the title is edited, the card shows the `editor` in its place; here the pencil renames the card in place with an inline input, and focus goes back to the pencil when it is done.

::Example{name="cards"}
