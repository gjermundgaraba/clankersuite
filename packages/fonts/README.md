# @gjermundgaraba/fonts

The fonts of the gjermundgaraba design system, self-hosted: each stylesheet declares one font's `@font-face` and loads its files from this package, so a page needs no font service.

## Use

Import the stylesheet of each font the tokens name, once, from the client entry:

```ts
import "@gjermundgaraba/fonts/inter.css";
import "@gjermundgaraba/fonts/departure-mono.css";
```

| Stylesheet           | `font-family`    |
| -------------------- | ---------------- |
| `inter.css`          | `Inter`          |
| `departure-mono.css` | `Departure Mono` |

## Licences

Each font keeps its own licence, in `licenses/`. Inter is © 2016 The Inter Project Authors, under the SIL Open Font License 1.1. Departure Mono is © 2024 Helena Zhang and Tobias Fried, under the MIT licence.
