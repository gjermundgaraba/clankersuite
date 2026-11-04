---
category: text
---

# Text

Quiet words in one of the system's two secondary voices. `Text.meta` is the UI face at label size, beside a title or a name: an address, a count, "shown once". `Text.note` is the body face, kept to a note's measure, for a line under or between parts: an empty list's "No matching tasks", a hint under a form.

A meta prints a `span` and a note a `p`; a meta line of its own goes in a `p` of the caller's. Panel, Card, PageHead and Identity print their `meta` as a meta themselves.

::Example{name="tones"}
