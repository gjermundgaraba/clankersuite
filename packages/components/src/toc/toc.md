---
category: navigation
---

# Toc

A page's headings as plain links in a `<nav>` named "On this page", beside an authored page. One ink cell marks the heading being read, which is also `aria-current`. Scroll this page and the mark follows the headings under the contents.

::Example{name="reading-position"}

## Reading position

`readingPositionEntry` is a Subscription that reports the heading being read: the last that has passed the upper fifth of the view, else the first. It reports once at the start and then on each scroll that moves it to another heading. Keep the id in the Model and pass it back as `maybeCurrentId`; until it first reports, the first heading is marked.

## Levels

An entry at level 2 sits at the margin, and one at level 3 is indented under it.
