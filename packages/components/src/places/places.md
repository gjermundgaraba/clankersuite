---
category: navigation
---

# Places

A column of places to go (areas, collections, saved filters), flush in a rail's panel. It is a navigation landmark named by its label, and the place you are in is printed inverted and `aria-current`: `"page"` on a link, `"true"` on a button. A place's name is authored, so it prints in sans and wraps rather than clipping.

## Shown in the page

A place with `onSelect` is a button: it shows the place without leaving the page.

::Example{name="areas"}

## Links

A place with `href` is a link, so a new tab can open it and it reads as one.

::Example{name="links"}
