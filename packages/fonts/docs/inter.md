---
order: 7
---

# Inter

The text face of clankersuite, set in every control, label, title and body text: the `--semantic-font-family-ui` token names it. It is self-hosted, so a page needs no font service: the stylesheet declares its `@font-face` and loads two WOFF2 files from this package.

## Import

`clankersuite.css` imports it, before the tokens and the components' stylesheet, so an application imports that once, from the client entry:

```ts
import "@gjermundgaraba/components/clankersuite.css";
```

| Stylesheet  | `font-family` | Weight  |
| ----------- | ------------- | ------- |
| `inter.css` | `Inter`       | 100–900 |

It is a variable font: one file carries every weight, and a second carries the italic. It swaps in when it loads (`font-display: swap`); until then the token falls back to the system's sans.

## Licence

Inter is © 2016 The Inter Project Authors, under the SIL Open Font License 1.1. The package carries its notice in `licenses/inter.txt`; the font's source and full licence are at [rsms/inter](https://github.com/rsms/inter).
