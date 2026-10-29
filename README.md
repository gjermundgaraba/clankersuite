# clankersuite

- [`packages/pixel-paper`](packages/pixel-paper): the pixel-paper design system, published as `@gjermundgaraba/pixel-paper`.
- [`apps/pixel-paper-catalog`](apps/pixel-paper-catalog): every pixel-paper component in every state.

## Development

```bash
vp install
vp run dev     # the catalog
vp run ready   # check, test and build everything
```

`vp run pixel-paper-catalog#smoke` drives the built catalog in Chromium; `vp run pixel-paper-catalog#install-browser` installs it with its system libraries first.
