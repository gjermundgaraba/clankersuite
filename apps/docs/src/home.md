# gjermundgaraba

One set of Foldkit components for the clanker applications, styled by a brand. A brand is a token set, a font and, one day, its own drawing of the glyphs; clankersuite is the only brand.

| Package                         | Holds                                       |
| ------------------------------- | ------------------------------------------- |
| `@gjermundgaraba/design-tokens` | the tokens, one stylesheet a brand          |
| `@gjermundgaraba/fonts`         | self-hosted fonts, one stylesheet a font    |
| `@gjermundgaraba/icons`         | the 12×12 glyphs, as Foldkit views          |
| `@gjermundgaraba/components`    | the Foldkit components and their stylesheet |

The packages are released together, at one version. An application imports its brand's stylesheet, which brings the font, the brand's tokens and the components' stylesheet:

```ts
import "@gjermundgaraba/components/clankersuite.css";
```
