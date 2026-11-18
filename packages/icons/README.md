# @gjermundgaraba/icons

The glyphs of the gjermundgaraba design system: 16px line icons, one weight with round ends, rendered as Foldkit views in `currentColor`. Most are adapted from [Lucide](https://lucide.dev) (ISC; see `THIRD_PARTY_NOTICES.md`), the rest drawn to match.

## Use

```ts
import { Glyph } from "@gjermundgaraba/icons";

Glyph.view({ name: "caret-down" }, h);
```

A glyph is decorative: label the control that holds it. `GlyphName` is every name in the set.
