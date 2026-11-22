---
category: status
---

# Meter

A reading against a maximum as a rounded bar, in a ruled list edge to edge in a flush panel. The percentage turns amber from 80%, and a red chip marks the maximum. Screen readers hear the value, the maximum and the numbers in words.

## Readings

A plain reading, one amber from 80%, one at its maximum, a stale one whose last reading failed, and a percentage alone. A stale meter prints muted with the last known numbers; its foot says why and when it was last read. `valueText` with `hasNumbers: false` leaves out a numbers line that would repeat the percentage.

::Example{name="usage"}

Each list lays its rows out by its own width, not the page's, so meters in a narrow column put the name over the bar.

## Toned

For a wall of limits scanned by level, `isToned` fills the bar in the reading's amber or red as well.

::Example{name="toned"}
