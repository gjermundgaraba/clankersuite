---
category: plumbing
---

# Scheme

The reader's choice of palette: system, paper or plum. `SchemeSwitch` pins it on `<html data-color-scheme>` and remembers it on this device; under system, the page follows the palette the reader's system prefers. The switch is a `Segmented`.

Put `schemeScript` from `@gjermundgaraba/components/scheme` inline in the page's `<head>`, so a remembered choice applies before first paint. Lift the switch's `subscriptions` into the application's; their key is fixed, so an application has one switch.

::Example{name="switch"}

This example is its own program, so it and the switch in this site's top bar each keep their own Model: either one switches the page, but the other does not show the change until the page loads again.
