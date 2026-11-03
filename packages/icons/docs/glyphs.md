---
order: 8
---

# Glyphs

Every icon in the system is a glyph: filled cells on one 12×12 grid, twelve rows of twelve, with no curves and no other icon set. A glyph prints in `currentColor` at the 12px it was drawn for, and it is decorative: label the control that holds it.

```ts
import { Glyph } from "@gjermundgaraba/icons";

Glyph.view({ name: "caret-down" }, h);
```

A component that shows a glyph takes its name, as `Button.view({ label: "add", glyph: "plus" }, h)` does. `GlyphName` is every name in the set; the names are shared by every brand.

## Every glyph

The set by family. Find a glyph by part of its name, or show one family; press one to copy its name.

::Example{name="glyphs"}
