# @gjermundgaraba/design-tokens

The design tokens of the gjermundgaraba design system: W3C DTCG sources, built by [Terrazzo](https://terrazzo.app) into one stylesheet, `clankersuite.css`.

## Use

Import the stylesheet once, before the component stylesheet:

```ts
import "@gjermundgaraba/design-tokens/clankersuite.css";
```

Semantic colours are `light-dark()` pairs, so they follow the `color-scheme` of the element that uses them. The page follows the reader's preference; `data-color-scheme="light"` or `data-color-scheme="dark"` on `<html>` pins one, and `color-scheme` on any element switches what is inside it.

Use the `--semantic-*` tokens. The `--primitive-*` tokens are the colour palette the semantic colours point at, and may change or disappear in any release.

## Layout

```text
tokens/
├── primitive/               the colour palette
├── semantic/                roles, one file per DTCG type
│   └── color/               light.tokens.json and dark.tokens.json
└── resolver.json
generated/
└── clankersuite.css         built from the resolver, committed
terrazzo.config.ts           the build
```

`tokens/resolver.json` loads the palette, the semantic tokens, then the colour scheme's colours: its `colorScheme` modifier picks `light` or `dark`, and the build writes each semantic colour as the `light-dark()` pair of the two.

## Naming

A name is `<layer>.<category>.<type>[.<item>][.<variant>][.<state>]`. The layer is `primitive` (colours only) or `semantic`; the category is the DTCG type (`color`, `dimension`, `duration`, `cubicBezier`, `number`, `fontFamily`, `fontWeight`, `shadow`). Names are camelCase; the CSS custom property is the name in kebab case, `semantic.color.text.onNegativeFill` as `--semantic-color-text-on-negative-fill`.

Primitives are the colour palette: literals that never alias, each a family and a lightness step (`primitive.color.forest.850`), with an alpha as part of the step (`850Alpha40`).

Semantic tokens name a role. A semantic colour aliases a palette colour in both colour schemes, never a literal, so the two schemes draw from one palette; the build fails otherwise. Every other semantic token holds its value, or aliases another semantic token where one role is defined by another (`space.inset` is `space.large`).

| Category      | Types                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| `color`       | `text`, `border`, `focusRing`, `background`, `shadow`                           |
| `dimension`   | `fontSize`, `letterSpacing`, `borderWidth`, `radius`, `size`, `space`, `travel` |
| `duration`    | one per motion: `card`, `flash`, `spin`, `veil`                                 |
| `cubicBezier` | `standard`, the one easing every motion uses                                    |
| `number`      | `opacity`, `lineHeight`, `layer`, `scale`, `fontScale`                          |
| `fontFamily`  | `ui`, `code`, `brand`                                                           |
| `fontWeight`  | `regular`, `medium`, `bold`                                                     |
| `shadow`      | `hairline`, a ring in place of a border; `float`, on everything that floats     |

- `background.canvas` is the page; `background.sidebar` is the full-height sidebar beside it; `background.surface` is a panel, card, dialog or control; `background.head` is the sunken ground: a table head, a shelf, code, a count's box, and what is lifted or a drop lands on; it never tints a hover. `background.hover` tints what the pointer is over and `background.selected` what is selected or current, under text that keeps its own colour. `background.fill.*` fills a bounded shape: a button, a mark, a meter. `background.tint.*` is a tone's soft ground, under its `text.*` colour: a Go, Warn or Blocked chip. `background.marker.*` are the colours an application gives its areas and goals.
- `text.primary`, `.secondary` and `.tertiary` read first, second and third; each holds 4.5:1 on every ground.
- `text.on<Fill>` is what reads on that fill.
- `border.primary` is a control's edge, at 3:1 on every ground; `border.secondary` is the softer ring of a button or key hint; `border.divider` divides and draws the hairline ring, and is never the only cue for a control.
- `focusRing.*` is the keyboard-focus indicator, whatever draws it.
- Status variants are `negative`, `warning` and `positive`, and say what something means, not how loud it is.
- `space` is one scale on a 4px rhythm, a T-shirt size per step from `xxSmall` to `xxLarge`. A gap, a padding and a margin that acts as a gap all take a step of it; a component picks the step, and changing a step changes every component on it. Steps are named, not numbered, so the rhythm can be retuned without renaming.
- Some roles stand over the scale, because they recur across many components or set a page's frame, and may need to be looser or tighter on their own: `space.inset`, the padding inside a surface's body (a panel, card or window); `space.gutter`, the room between whole surfaces and between them and the page's edge; `space.page.*`, the room above a Deck's content and either side of it; `space.control.padding.*`, inside a control (below); `space.focusRing.offset.*`, how far a focus ring stands off its box; and `space.underline.offset`, how far an underline sits below text. Anything else uses the scale directly.
- A control is sized by its height, not its padding: `size.control` for a button, field, select, segment or menu item and `size.controlSmall` for a small button, tab or chip are each a `min-height`, and the label is centred in it. `size.row` is a row, a list item or a title bar: a control and room around it. `space.control.padding.inline.default` and `.small` are the room beside a control's label; roomier controls change them and the heights, and no line has to add up.
- `radius.control` rounds what is pressed or typed into; `radius.row` rounds a menu and the select picker; `radius.surface` rounds what contains; `radius.pill` rounds a chip or a count to its ends; `radius.mark` rounds a checkbox; `radius.marker` rounds a Marker's square.
- `travel` is how far a thing moves: an entering toast.
- `layer` is a `z-index`, named by what sits on it.

The component stylesheet and the Markdown editor's theme write no raw value a token covers; a test fails on one. Raw are: zero; relative units (`em`, `lh`, `%`, viewport units); counts; angles; the geometry of a drawn tile (`background-size` and `background-position`); and `@media` and `@container` thresholds, where `var()` does not work.

Every semantic token carries a `$description` saying where it is used.

## Develop

```bash
vp run @gjermundgaraba/design-tokens#build   # tokens/ to generated/
vp run @gjermundgaraba/design-tokens#check   # Terrazzo's checks
```

Commit `generated/` with the sources it was built from. CI rebuilds it and fails if the tree changes.
