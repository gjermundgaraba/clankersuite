# design-system

The gjermundgaraba design system: one set of components for the clanker applications, styled by a brand. clankersuite is the first brand.

| Package                                            | Published as                    | Holds                                                 |
| -------------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| [`packages/design-tokens`](packages/design-tokens) | `@gjermundgaraba/design-tokens` | DTCG token sources, built into one stylesheet a brand |
| [`packages/fonts`](packages/fonts)                 | `@gjermundgaraba/fonts`         | self-hosted fonts, one stylesheet a font              |
| [`packages/icons`](packages/icons)                 | `@gjermundgaraba/icons`         | the 12×12 glyphs, as Foldkit views                    |
| [`packages/components`](packages/components)       | `@gjermundgaraba/components`    | the Foldkit components and their stylesheet           |
| [`apps/docs`](apps/docs)                           | not published                   | every component in every state                        |

The packages are released together, at one version. `MIGRATION.md` maps `@gjermundgaraba/pixel-paper` onto them.

## Development

```bash
vp install
vp run dev     # the docs
vp run ready   # check, test and build everything
```

`vp run docs#smoke` drives the built docs in Chromium; `vp run docs#install-browser` installs it with its system libraries first.
