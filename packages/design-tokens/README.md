# @gjermundgaraba/design-tokens

The design tokens of the gjermundgaraba design system: W3C DTCG sources, built by [Terrazzo](https://terrazzo.app) into one stylesheet per brand.

## Use

Import exactly one brand stylesheet, once, before the component stylesheet:

```ts
import "@gjermundgaraba/design-tokens/clankersuite.css";
```

Brands: `clankersuite`.

Semantic colours are `light-dark()` pairs, so they follow the `color-scheme` of the element that uses them. The page follows the reader's preference; `data-scheme="light"` or `data-scheme="dark"` on `<html>` pins one, and `color-scheme` on any element switches what is inside it.

Use the `--semantic-*` tokens. The `--primitive-*` tokens are the raw values the semantic ones point at, and may change or disappear in any release.

## Layout

```text
tokens/
├── shared/
│   ├── primitive/           raw values, one file per DTCG type
│   └── semantic/            roles, one file per DTCG type
│       └── color/           light.tokens.json and dark.tokens.json
├── clankersuite/            the brand's overrides of shared tokens (none yet)
└── clankersuite.resolver.json
generated/
└── clankersuite.css         built from the resolver, committed
```

Each `tokens/<brand>.resolver.json` loads the shared primitives, the shared semantics, the colour scheme's colours, then the brand's overrides; a later definition of a token wins. clankersuite is the shared baseline: its values are the shared ones.

To add a brand, add `tokens/<brand>/` with only the values that differ, a resolver that loads them after their shared equivalents, a `terrazzo.<brand>.config.ts` that calls `brandConfig("<brand>")`, its build in `package.json`, and its stylesheet in `exports`. Do not copy shared values into a brand; copies drift.

## Naming

A name is `<layer>.<category>.<type>[.<item>][.<variant>][.<state>]`. The layer is `primitive` or `semantic`; the category is the DTCG type (`color`, `dimension`, `duration`, `number`, `fontFamily`, `fontWeight`, `shadow`). Names are camelCase; the CSS custom property is the name in kebab case, `semantic.color.text.onInverseFill` as `--semantic-color-text-on-inverse-fill`.

Primitives hold literals and never alias. Colours are a family and a lightness step (`primitive.color.warmGray.950`), with an alpha as part of the step (`950Alpha85`); dimensions are named by their pixel value (`primitive.dimension.16`).

Semantic tokens name a role and always alias, so a brand changes a value without changing a component. A semantic colour aliases a token in both colour schemes, never a literal; the build fails otherwise.

| Category     | Types                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| `color`      | `text`, `border`, `focusRing`, `background`, `shadow`                           |
| `dimension`  | `fontSize`, `letterSpacing`, `borderWidth`, `radius`, `size`, `space`, `travel` |
| `duration`   | one per motion: `blink`, `card`, `flash`, `veil`                                |
| `number`     | `opacity`, `lineHeight`, `layer`, `scale`, `fontScale`                          |
| `fontFamily` | `ui`, `body`, `code`                                                            |
| `fontWeight` | `regular`, `semiBold`, `bold`, `prose`                                          |
| `shadow`     | one per raised thing: `button`, `card`, `panel`, `pressed`, `negative`          |

- `background.canvas` is the page; `background.surface` is a panel, card, dialog or control; `background.head` is a title bar or table head. `background.fill.*` fills a bounded shape: a button, a chip, a mark.
- `text.on<Fill>` and `border.on<Fill>` are what reads on that fill.
- `border.primary` contains; `border.divider` divides and is never the only cue for a control.
- `focusRing.*` is the keyboard-focus indicator, whatever draws it.
- Status variants are `negative`, `warning` and `positive`, and say what something means, not how loud it is.
- `space.padding` and `space.gap` are T-shirt ladders (`xxxSmall` to `xxLarge`) on whole pixels. A component picks a step; a brand that changes a step changes every component on it.
- `space.control.padding.block` and `.inline` are the inside of a control. A control's row height is its line plus its padding plus its border, so these steps are a pixel apart and some are odd: they keep a bordered control on the row height.
- `radius.control` rounds what is pressed or typed into; `radius.surface` rounds what contains. Both are 0 in clankersuite.
- `travel` is how far a thing moves: a pressed button, an entering toast, a glyph nudged onto the baseline.
- `layer` is a `z-index`, named by what sits on it.

The component stylesheet writes no raw value a token covers; a test fails on one. Raw are: zero; relative units (`em`, `lh`, `%`, viewport units); counts; angles; the geometry of a drawn tile (`background-size` and `background-position`); and `@media` and `@container` thresholds, where `var()` does not work.

Every semantic token carries a `$description` saying where it is used.

## Develop

```bash
vp run @gjermundgaraba/design-tokens#build   # tokens/ to generated/
vp run @gjermundgaraba/design-tokens#check   # Terrazzo's checks
```

Commit `generated/` with the sources it was built from. CI rebuilds it and fails if the tree changes.
