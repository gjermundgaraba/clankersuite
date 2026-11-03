# gjermundgaraba

One set of Foldkit components for the clanker applications, styled by a brand. A brand is a token set, a font and a drawing of the glyphs; clankersuite is the first.

| Package                         | Holds                                       |
| ------------------------------- | ------------------------------------------- |
| `@gjermundgaraba/design-tokens` | the tokens, one stylesheet a brand          |
| `@gjermundgaraba/fonts`         | self-hosted fonts, one stylesheet a font    |
| `@gjermundgaraba/icons`         | the 12×12 glyphs, as Foldkit views          |
| `@gjermundgaraba/components`    | the Foldkit components and their stylesheet |

The packages are released together, at one version. An application imports the font, then its brand's tokens, then the components' stylesheet:

```ts
import "@gjermundgaraba/fonts/departure-mono.css";
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/components/components.css";
```
