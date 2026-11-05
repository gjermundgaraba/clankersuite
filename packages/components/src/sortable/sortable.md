---
category: data
---

# Sortable

Items the reader puts in order, as rows, as tiles or as panels. Only the grip lifts an item, under every pointer, so the item's own text still selects and a finger on a row still scrolls the page. The items are the application's: a drop reports `Moved`, and the application moves the item.

## Rows

The default layout: rows between rules, for a flush panel. Drag a row by its grip, or take the grip with the keyboard: Space picks the item up, each arrow moves it one place, Space drops it and Escape puts it back. Every step is said through the live region, and the item flashes where it lands. A long name wraps.

::Example{name="rows"}

Lift `Sortable.subscriptions` into the application's, once per list, with a key prefix no other Subscription uses, or nothing follows the pointer or the keys.

## Tiles

`layout: "Grid"` prints tiles that wrap, 180px and up, read across.

::Example{name="tiles"}

## Panels

`layout: "Panels"` reorders the application's own panels, each by the grip it puts in its title bar's `lead`.

::Example{name="panels"}
