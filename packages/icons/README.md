# @gjermundgaraba/icons

The glyphs of the gjermundgaraba design system. Each is drawn as it prints, twelve rows of twelve cells on one grid, and renders as a Foldkit view in `currentColor`.

## Use

```ts
import { Glyph } from "@gjermundgaraba/icons";

Glyph.view({ name: "caret-down" }, h);
```

A glyph is decorative: label the control that holds it. `GlyphName` is every name in the set; the names are shared by every brand.
