---
category: data
---

# Reel

A row of columns of panes, for a workspace of windows side by side. It scrolls sideways when it is wider than its frame, and down where a column is taller. The reel takes its height from whatever holds it. The layout is the application's, addressed by id: a move reports what it asks of the layout, and the application applies it, usually with `Reel.apply`.

## Moving and sizing panes

A pane's grip moves it, by pointer or keyboard, into another column or into a gap, where it becomes a column of its own. With the keyboard, Space picks the pane up, the arrows move it, Space drops it, and Escape or Tab puts it back. The splitters size a column, or the panes in it. Closing a pane is the application's change to the layout; it calls `Reel.reconcile`, and focus moves to the pane nearest the one that went.

::Example{name="strip"}

The application's keys focus and move panes through `Reel.perform`. These are bound in a Mount on the element around the reel, matched by `KeyboardEvent.code`, because on macOS Option turns a letter into another character:

| Keys                            | Does                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Meta Alt H, J, K, L or an arrow | Focus the pane to the left, below, above or to the right                             |
| Meta Alt Shift H, J, K, L       | Move the pane into the column to the left, down, up, or into the column to the right |
| Meta Control Alt H, L           | Move the column left or right                                                        |
| Meta Alt E                      | Move the pane into a column of its own                                               |
| Meta Alt R                      | The column's next width                                                              |

Lift `Reel.subscriptions` into the application's, once per reel, with a key prefix no other Subscription uses, or nothing follows the pointer.

## One layout, two reels

Two reels can show one layout, as two clients of one workspace: each keeps its own focus and scroll, and a move in one shows in both. The second prints its panes as tabs, one at a time at the reel's full size, a press or the arrows on the tabs choosing it, with no grips or splitters.

::Example{name="clients"}
