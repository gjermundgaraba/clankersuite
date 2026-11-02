# Migrating from pixel-paper

`@gjermundgaraba/pixel-paper` is four packages, released together at one version:

| Package                         | Holds                                                           |
| ------------------------------- | --------------------------------------------------------------- |
| `@gjermundgaraba/design-tokens` | one stylesheet of tokens per brand                              |
| `@gjermundgaraba/fonts`         | one stylesheet per font, with its files                         |
| `@gjermundgaraba/icons`         | `Glyph`, and the `GlyphName` and `Cell` types                   |
| `@gjermundgaraba/components`    | every other export of pixel-paper, and the component stylesheet |

Import the font, the brand's tokens and the component stylesheet once, in that order, from the client entry:

```ts
import "@gjermundgaraba/fonts/departure-mono.css";
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/components/components.css";
```

| pixel-paper                                           | now                                                  |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `import { Glyph } from "@gjermundgaraba/pixel-paper"` | `import { Glyph } from "@gjermundgaraba/icons"`      |
| `import { … } from "@gjermundgaraba/pixel-paper"`     | `import { … } from "@gjermundgaraba/components"`     |
| `@gjermundgaraba/pixel-paper/scheme`                  | `@gjermundgaraba/components/scheme`                  |
| `@gjermundgaraba/pixel-paper/markdown-editor/element` | `@gjermundgaraba/components/markdown-editor/element` |
| `@gjermundgaraba/pixel-paper/pixel-paper.css`         | `@gjermundgaraba/components/components.css`          |
| `@gjermundgaraba/pixel-paper/tokens.css`              | `@gjermundgaraba/design-tokens/clankersuite.css`     |

## Token names

A token that served several roles is now one token per role. Pick the row for the property it is used in.

| pixel-paper                                                                  | design-tokens                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `--ink` as text (`color`, `caret-color`, `text-decoration-color`)            | `--semantic-color-text-primary`                           |
| `--ink` as border (`border*`, `box-shadow`, an outline that is not focus)    | `--semantic-color-border-primary`                         |
| `--ink` as focus ring (an outline under `:focus`)                            | `--semantic-color-focus-ring-default`                     |
| `--ink` as background (`background*`, `accent-color`)                        | `--semantic-color-background-fill-inverse`                |
| `--paper` as text (`color`, `caret-color`, `text-decoration-color`)          | `--semantic-color-text-on-inverse-fill`                   |
| `--paper` as border (`border*`, `box-shadow`, an outline that is not focus)  | `--semantic-color-border-on-inverse-fill`                 |
| `--paper` as focus ring (an outline under `:focus`)                          | `--semantic-color-focus-ring-on-inverse-fill`             |
| `--paper` as background (`background*`, `accent-color`)                      | `--semantic-color-background-surface`                     |
| `--ground` as background (`background*`, `accent-color`)                     | `--semantic-color-background-canvas`                      |
| `--ground` as border (`border*`, `box-shadow`, an outline that is not focus) | `--semantic-color-background-canvas`                      |
| `--rule` as border (`border*`, `box-shadow`, an outline that is not focus)   | `--semantic-color-border-divider`                         |
| `--rule` as background (`background*`, `accent-color`)                       | `--semantic-color-border-divider`                         |
| `--head` as background (`background*`, `accent-color`)                       | `--semantic-color-background-head`                        |
| `--muted` as text (`color`, `caret-color`, `text-decoration-color`)          | `--semantic-color-text-secondary`                         |
| `--muted` as border (`border*`, `box-shadow`, an outline that is not focus)  | `--semantic-color-border-secondary`                       |
| `--muted` as focus ring (an outline under `:focus`)                          | `--semantic-color-focus-ring-secondary`                   |
| `--muted` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-secondary`              |
| `--red` as text (`color`, `caret-color`, `text-decoration-color`)            | `--semantic-color-text-negative`                          |
| `--red` as border (`border*`, `box-shadow`, an outline that is not focus)    | `--semantic-color-border-negative`                        |
| `--red` as focus ring (an outline under `:focus`)                            | `--semantic-color-focus-ring-negative`                    |
| `--red` as background (`background*`, `accent-color`)                        | `--semantic-color-background-fill-negative`               |
| `--amber` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-warning`                |
| `--green` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-positive`               |
| `--on-status` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-on-status-fill`                    |
| `--on-red` as text (`color`, `caret-color`, `text-decoration-color`)         | `--semantic-color-text-on-negative-fill`                  |
| `--on-head` as text (`color`, `caret-color`, `text-decoration-color`)        | `--semantic-color-text-on-head`                           |
| `--term-red` as text (`color`, `caret-color`, `text-decoration-color`)       | `--semantic-color-text-terminal-red`                      |
| `--term-green` as text (`color`, `caret-color`, `text-decoration-color`)     | `--semantic-color-text-terminal-green`                    |
| `--term-yellow` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-terminal-yellow`                   |
| `--term-blue` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-terminal-blue`                     |
| `--term-magenta` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-terminal-magenta`                  |
| `--term-cyan` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-terminal-cyan`                     |
| `--code-keyword` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-code-keyword`                      |
| `--code-string` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-code-string`                       |
| `--code-number` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-code-number`                       |
| `--code-function` as text (`color`, `caret-color`, `text-decoration-color`)  | `--semantic-color-text-code-function`                     |
| `--code-type` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-code-type`                         |
| `--code-comment` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-code-comment`                      |
| `--veil` as background (`background*`, `accent-color`)                       | `--semantic-color-background-backdrop`                    |
| `--fade-on-ink`                                                              | `--semantic-number-opacity-muted-on-inverse-fill`         |
| `--fade-held`                                                                | `--semantic-number-opacity-disabled-on-inverse-fill`      |
| `--fade-dragged`                                                             | `--semantic-number-opacity-dragged`                       |
| `--font-px`                                                                  | `--semantic-font-family-ui`                               |
| `--font-body`                                                                | `--semantic-font-family-body`                             |
| `--font-code`                                                                | `--semantic-font-family-code`                             |
| `--read-weight`                                                              | `--semantic-font-weight-prose-heading`                    |
| `--type-label`                                                               | `--semantic-dimension-font-size-label`                    |
| `--type-state`                                                               | `--semantic-dimension-font-size-state`                    |
| `--type-control`                                                             | `--semantic-dimension-font-size-control`                  |
| `--type-body`                                                                | `--semantic-dimension-font-size-body`                     |
| `--type-name`                                                                | `--semantic-dimension-font-size-name`                     |
| `--type-title`                                                               | `--semantic-dimension-font-size-title`                    |
| `--type-page`                                                                | `--semantic-dimension-font-size-page`                     |
| `--type-page-narrow`                                                         | `--semantic-dimension-font-size-page-narrow`              |
| `--type-wordmark`                                                            | `--semantic-dimension-font-size-wordmark`                 |
| `--type-wordmark-wall`                                                       | `--semantic-dimension-font-size-wordmark-wall`            |
| `--type-figure`                                                              | `--semantic-dimension-font-size-figure`                   |
| `--type-figure-narrow`                                                       | `--semantic-dimension-font-size-figure-narrow`            |
| `--read-body`                                                                | `--semantic-dimension-font-size-prose-body`               |
| `--read-h3`                                                                  | `--semantic-dimension-font-size-prose-heading-3`          |
| `--read-h2`                                                                  | `--semantic-dimension-font-size-prose-heading-2`          |
| `--read-title`                                                               | `--semantic-dimension-font-size-prose-title`              |
| `--read-measure`                                                             | `--semantic-dimension-size-max-width-prose`               |
| `--tracking-caps`                                                            | `--semantic-dimension-letter-spacing-caps`                |
| `--tracking-state`                                                           | `--semantic-dimension-letter-spacing-state`               |
| `--tracking-head`                                                            | `--semantic-dimension-letter-spacing-head`                |
| `--tracking-title`                                                           | `--semantic-dimension-letter-spacing-title`               |
| `--tracking-label`                                                           | `--semantic-dimension-letter-spacing-label`               |
| `--line`                                                                     | `--semantic-dimension-border-width-container`             |
| `--hair`                                                                     | `--semantic-dimension-border-width-divider`               |
| `--row`                                                                      | `--semantic-dimension-size-row`                           |
| `--deck`                                                                     | `--semantic-dimension-size-max-width-deck`                |
| `--rail`                                                                     | `--semantic-dimension-size-rail-default`                  |
| `--rail-drawer`                                                              | `--semantic-dimension-size-rail-drawer`                   |
| `--rail-folded`                                                              | `--semantic-dimension-size-rail-folded`                   |
| `--reel-column-min`                                                          | `--semantic-dimension-size-min-width-reel-column`         |
| `--reel-pane-min`                                                            | `--semantic-dimension-size-min-height-reel-pane`          |
| `--bench-work-min`                                                           | `--semantic-dimension-size-min-height-bench-work`         |
| `--bench-head-min`                                                           | `--semantic-dimension-size-min-height-bench-head`         |
| `--pad`                                                                      | `--semantic-dimension-space-padding-panel`                |
| `--space-s`                                                                  | `--semantic-dimension-space-gap-inline`                   |
| `--space-m`                                                                  | `--semantic-dimension-space-gap-body`                     |
| `--space-l`                                                                  | `--semantic-dimension-space-gap-surface`                  |
| `--gap`                                                                      | `--semantic-dimension-space-gap-surface`                  |
| `--reel-gutter`                                                              | `--semantic-dimension-space-gap-reel`                     |
| `--shadow-card`                                                              | `--semantic-shadow-card`                                  |
| `--shadow-panel`                                                             | `--semantic-shadow-panel`                                 |
| `--shadow-button`                                                            | `--semantic-shadow-button-default`                        |
| `--shadow-button-small`                                                      | `--semantic-shadow-button-small`                          |
| `--shadow-pressed`                                                           | `--semantic-shadow-pressed`                               |
| `--shadow-danger`                                                            | `--semantic-shadow-negative`                              |
| `--motion-flash`                                                             | `--semantic-duration-flash`                               |
| `--motion-blink`                                                             | `--semantic-duration-blink`                               |
| `--motion-card`                                                              | `--semantic-duration-card`                                |
| `--motion-veil`                                                              | `--semantic-duration-veil`                                |
| `--term-black`                                                               | removed: nothing used it                                  |
| `--chart-plot`                                                               | removed: nothing used it                                  |
| `--toast-hold`                                                               | removed: the hold is five seconds in `Toast`, not a style |
| `--dither`, `--veil-grain`                                                   | unchanged, defined by `components.css` from colour tokens |

## Classes

Every class the component stylesheet styles is prefixed `gg-`: `.btn` is `.gg-btn`, `.panel-tb` is `.gg-panel-tb`, `.small` is `.gg-small`. An application's own stylesheet that reaches into a component by its class takes the prefix too. Two exceptions:

| pixel-paper | now        | why                                              |
| ----------- | ---------- | ------------------------------------------------ |
| `.px-icon`  | `.gg-icon` | `.gg-glyph` is the existing `.glyph` class       |
| `.sr-only`  | `.sr-only` | `@foldkit/ui` writes it on its own hidden inputs |

CodeMirror's `cm-` classes, the highlighter's `tok-` classes and the Markdown editor's `lmd-` classes are unchanged.

## Attributes and other names

| pixel-paper                                         | now                                      |
| --------------------------------------------------- | ---------------------------------------- |
| `data-scheme` on `<html>`                           | `data-color-scheme`                      |
| `localStorage` key `pixel-paper-scheme`             | `gg-scheme`: a stored choice resets once |
| `<pp-markdown-editor>`                              | `<gg-markdown-editor>`                   |
| `data-pixel-paper-announcer`, `ANNOUNCER_ATTRIBUTE` | `data-gg-announcer`                      |
| `data-pixel-paper-announcing`                       | `data-gg-announcing`                     |
| `data-pixel-paper-action-bar`                       | `data-gg-action-bar`                     |
| `data-pixel-paper-dragging`                         | `data-gg-dragging`                       |
| `data-pixel-paper-slip-first`, `-last`              | `data-gg-slip-first`, `-last`            |
| `pixel-paper-palette-*`                             | `gg-palette-*`                           |
| the flash animation id `pixel-paper-flash`          | `gg-flash`                               |
