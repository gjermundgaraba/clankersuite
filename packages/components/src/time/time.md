---
category: text
---

# Time

A moment, said relative to the page's one clock or as a date, in a `<time>` that carries the moment in ISO form.

## Against the clock

The application keeps the current time in its Model, from the `Time.clockEntry` Subscription, which ticks once a second while anything on the page reads it, and hands it to every Time as `maybeNow`. An age older than `staleAfter` prints red. A countdown says `passed` once its moment has gone; this one crosses zero a minute after the page opened. Dates and times print in the reader's zone.

::Example{name="clock"}

## A calendar day

A day with no time of its own (a due date, the day a task wakes) prints through `Time.dayView`, in the words the application says it in against its own today, in the age or the due register. A due day gone by is `isLate`, and prints red.

::Example{name="days"}

## Before the clock ticks

Until the first tick, as in HTML built on a server, `maybeNow` is `None` and every Time prints its moment in UTC, so the server and the browser write the same text.

::Example{name="utc"}
