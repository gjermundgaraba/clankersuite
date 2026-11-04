---
category: forms
---

# Filter chip

A filter as a chip, in a `FilterStrip` above the list it filters. With `onToggle` it is a toggle button, inverted and `aria-pressed` while in force. The reset chip is quiet and never pressed.

::Example{name="toggle"}

## Pinned

Without `onToggle` it is a label: a filter the page holds, inverted while pinned, and screen readers hear "(pinned)" after its words. When its words alone do not say it, `full` writes it out: screen readers hear the full words, and everyone else gets them as a tip.

::Example{name="pinned"}
