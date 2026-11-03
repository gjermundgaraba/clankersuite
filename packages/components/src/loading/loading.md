---
category: status
---

# Loading

What a panel says while its content is on the way, centred where the content will be, with the working cursor.

::Example{name="loading"}

## Heard as it starts

The line is a polite status, and a screen reader hears a status only when its words change. So render it before the content, from before the wait starts, and set `isLoading`. Once the content is in, the line empties and leaves the flow, taking no room and no gap, but stays in place, so the next wait is heard too. Remote does this for data that loads.
