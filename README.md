# design-system

The gjermundgaraba design system: one set of components for the clanker applications, in one look, clankersuite.

| Package                                            | Published as                    | Holds                                         |
| -------------------------------------------------- | ------------------------------- | --------------------------------------------- |
| [`packages/design-tokens`](packages/design-tokens) | `@gjermundgaraba/design-tokens` | DTCG token sources, built into one stylesheet |
| [`packages/fonts`](packages/fonts)                 | `@gjermundgaraba/fonts`         | self-hosted fonts, one stylesheet a font      |
| [`packages/icons`](packages/icons)                 | `@gjermundgaraba/icons`         | the line glyphs, as Foldkit views             |
| [`packages/components`](packages/components)       | `@gjermundgaraba/components`    | the Foldkit components and their stylesheet   |
| [`apps/docs`](apps/docs)                           | not published                   | the documentation site                        |

The packages are released together, at one version.

## Development

```bash
vp install
vp run dev     # the docs
vp run ready   # check, test and build everything
```

A component's docs page sits beside it, as `<dir>/<dir>.md` with its live examples in `examples/`; a package's other pages are in its `docs/`, with their examples in `apps/docs/src/foundations/<package>/examples/`.

`vp run docs#smoke` opens every page of the built docs in Chromium, first installing the Chromium the installed Playwright needs when it is missing; `vp run docs#install-browser` installs Chromium with its system libraries, for a machine that lacks them.
