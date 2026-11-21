---
order: 7
---

# Departure Mono

The brand face of clankersuite, set in the wordmark: the `--semantic-font-family-brand` token names it. It is self-hosted, so a page needs no font service: the stylesheet declares its `@font-face` and loads one WOFF2 file from this package.

## Import

`clankersuite.css` imports it, before the tokens and the components' stylesheet, so an application imports that once, from the client entry:

```ts
import "@gjermundgaraba/components/clankersuite.css";
```

| Stylesheet           | `font-family`    | Weight |
| -------------------- | ---------------- | ------ |
| `departure-mono.css` | `Departure Mono` | 400    |

It has one weight and no italic. It swaps in when it loads (`font-display: swap`); until then the token falls back to the system's monospace.

## Licence

Departure Mono v1.500 is © 2024 Helena Zhang and Tobias Fried, under the MIT licence. The package carries its notice in `licenses/departure-mono.txt`; the font's source and full licence are at [rektdeckard/departure-mono](https://github.com/rektdeckard/departure-mono).
