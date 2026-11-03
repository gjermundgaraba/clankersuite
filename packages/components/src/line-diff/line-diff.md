---
category: text
---

# Line diff

A unified diff the application already has, from a server or `git diff -- <path>`, as a ruled table: the old and new numbers, a sign, the line. Added lines sit on the head tint behind an ink +; removed lines go muted behind a red −, and each sign is named for screen readers.

## A patch from git

Its hunks' lines are numbered from their headers, and the unchanged lines between hunks fold into a counted row. What git's header says beyond the lines prints as a note line above the table: here, a rename.

::Example{name="renamed"}

## A file that changed type

A file that became a symlink is two sections, each its own table under one note, named for its side (`"<label>, as it was"`).

::Example{name="symlink"}

## Nothing to show as lines

A mode change, an empty or a binary file prints its note in the table's place. An empty patch says there is no difference; text that is not a diff, or holds several files, says it cannot be shown as lines. `LineDiff.describePatch` gives the same sentences, and the path a rename left, to an application that prints them itself.
