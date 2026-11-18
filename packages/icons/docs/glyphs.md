---
order: 8
---

# Glyphs

Every icon in the system is a glyph: a line drawing on a 24-unit square, printed at 16px with a 1.5px line, round ends and joins, and a solid shape only where the glyph means one, such as a dot. Most come from Lucide, the rest are drawn to match. A glyph prints in `currentColor`, and it is decorative: label the control that holds it.

```ts
import { Glyph } from "@gjermundgaraba/icons";

Glyph.view({ name: "caret-down" }, h);
```

A component that shows a glyph takes its name, as `Button.view({ label: "Add", glyph: "plus" }, h)` does. `GlyphName` is every name in the set; the names are shared by every brand.

## Every glyph

The set by family. Find a glyph by part of its name, or show one family; press one to copy its name.

::Example{name="glyphs"}
