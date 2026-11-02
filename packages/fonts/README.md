# @gjermundgaraba/fonts

The fonts of the gjermundgaraba design system, self-hosted: each stylesheet declares one font's `@font-face` and loads its files from this package, so a page needs no font service.

## Use

Import the stylesheet of each font the brand's tokens name, once, from the client entry:

```ts
import "@gjermundgaraba/fonts/departure-mono.css";
```

| Stylesheet           | `font-family`    | Brands       |
| -------------------- | ---------------- | ------------ |
| `departure-mono.css` | `Departure Mono` | clankersuite |

## Licences

Each font keeps its own licence, in `licenses/`. Departure Mono is © 2024 Helena Zhang and Tobias Fried, under the MIT licence.
