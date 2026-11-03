---
category: plumbing
---

# Announcer

The page's one polite live region, and `Announcer.Announce`, the Command that says something through it. Use it for a change a screen reader would otherwise miss: a row that left the list, a rename that landed, a move that was refused.

## Saying what changed

Archive a file: it leaves the list, and `Announce` says which one went. The region is for screen readers only, so nothing else shows. Words said in the same moment are read together, and the region clears first, so the same words twice are read twice. `Announce` reports `CompletedAnnounce`, which the application puts in its own Message union and changes nothing for.

::Example{name="announce"}

## Where the region goes

Render exactly one region, with `LiveRegion.view`, and place it with `LiveRegion.place` on every render. An open dialog makes the page outside it inert and hidden from screen readers, so the region goes inside the topmost open dialog, and at the end of the body while none is open; `Announce` finds it there. The dialog, confirm dialog, command palette and key help examples each place theirs.
