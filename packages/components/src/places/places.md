---
category: navigation
---

# Places

A column of places to go (lists, areas, saved filters), flat in a Rail. It is a navigation landmark named by its label, one line each: a glyph or a colour marker, the name and a quiet count. The place you are in sits on the surface in a hairline ring and is `aria-current`: `"page"` on a link, `"true"` on a button. A place's name is authored, so it prints in sans and wraps rather than clipping.

## Shown in the page

A place with `onSelect` is a button: it shows the place without leaving the page. Each leads with a 16px `glyph`.

::Example{name="counts"}

A place can carry a `count` of what waits there. It sits right-aligned after the name, quiet in the tertiary colour with tabular figures, and screen readers hear it after a pause: "Inbox, 3".

## Areas

`isLabelShown` prints the label above the places as the section's heading. An area leads with a `marker`, a small square in one of the area colours (`"Amber"`, `"Sky"`, `"Coral"`, `"Sand"`), and its `subPlaces` list under it, indented to its name and smaller.

::Example{name="areas"}

## Links

A place with `href` is a link, so a new tab can open it and it reads as one.

::Example{name="links"}
