# gjermundgaraba

One set of Foldkit components for the clanker applications, in one look, clankersuite: its tokens, fonts and glyphs.

| Package                         | Holds                                       |
| ------------------------------- | ------------------------------------------- |
| `@gjermundgaraba/design-tokens` | the tokens, as one stylesheet               |
| `@gjermundgaraba/fonts`         | self-hosted fonts, one stylesheet a font    |
| `@gjermundgaraba/icons`         | the line glyphs, as Foldkit views           |
| `@gjermundgaraba/components`    | the Foldkit components and their stylesheet |

The packages are released together, at one version. An application imports `clankersuite.css`, which brings the fonts, the tokens and the components' stylesheet:

```ts
import "@gjermundgaraba/components/clankersuite.css";
```
