---
category: plumbing
---

# Format

`Format.LOCALE` is the locale every number and date in the system is written in. Pass it to `toLocaleString` and `Intl` wherever the application formats one itself, so the server and every browser print the same text, whatever language the reader's browser is set to.

::Example{name="locale"}
