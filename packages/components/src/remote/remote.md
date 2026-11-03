---
category: status
---

# Remote

Data that loads, in each of Foldkit's `AsyncData` states, with the retry built in. Spread it where the content goes.

## A first load

A loading line while it first loads, then an error notice with retry when it failed with nothing to show. Retry takes the notice and its button away, so the update returns `Focus.Focus` on the loading line's `id` with the read: focus lands on the line, which says the load. Here the first read fails and the retry loads.

::Example{name="first-load"}

## Stale data

When a refresh fails, a warn notice with retry sits above the last data. Retry refreshes it: the data stays on show while it refreshes, quietly, so a page that polls is not heard each time.

::Example{name="stale"}
