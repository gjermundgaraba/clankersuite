# Migrating from pixel-paper

pixel-paper's tokens moved to `@gjermundgaraba/design-tokens`, one stylesheet per brand. Import the brand's stylesheet once, before the component stylesheet, which no longer imports any tokens:

```ts
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/pixel-paper/pixel-paper.css";
```

## Token names

A token that served several roles is now one token per role. Pick the row for the property it is used in.

| pixel-paper                                                                  | design-tokens                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `--ink` as text (`color`, `caret-color`, `text-decoration-color`)            | `--semantic-color-text-primary`                            |
| `--ink` as border (`border*`, `box-shadow`, an outline that is not focus)    | `--semantic-color-border-primary`                          |
| `--ink` as focus ring (an outline under `:focus`)                            | `--semantic-color-focus-ring-default`                      |
| `--ink` as background (`background*`, `accent-color`)                        | `--semantic-color-background-fill-inverse`                 |
| `--paper` as text (`color`, `caret-color`, `text-decoration-color`)          | `--semantic-color-text-on-inverse-fill`                    |
| `--paper` as border (`border*`, `box-shadow`, an outline that is not focus)  | `--semantic-color-border-on-inverse-fill`                  |
| `--paper` as focus ring (an outline under `:focus`)                          | `--semantic-color-focus-ring-on-inverse-fill`              |
| `--paper` as background (`background*`, `accent-color`)                      | `--semantic-color-background-surface`                      |
| `--ground` as background (`background*`, `accent-color`)                     | `--semantic-color-background-canvas`                       |
| `--ground` as border (`border*`, `box-shadow`, an outline that is not focus) | `--semantic-color-background-canvas`                       |
| `--rule` as border (`border*`, `box-shadow`, an outline that is not focus)   | `--semantic-color-border-divider`                          |
| `--rule` as background (`background*`, `accent-color`)                       | `--semantic-color-border-divider`                          |
| `--head` as background (`background*`, `accent-color`)                       | `--semantic-color-background-head`                         |
| `--muted` as text (`color`, `caret-color`, `text-decoration-color`)          | `--semantic-color-text-secondary`                          |
| `--muted` as border (`border*`, `box-shadow`, an outline that is not focus)  | `--semantic-color-border-secondary`                        |
| `--muted` as focus ring (an outline under `:focus`)                          | `--semantic-color-focus-ring-secondary`                    |
| `--muted` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-secondary`               |
| `--red` as text (`color`, `caret-color`, `text-decoration-color`)            | `--semantic-color-text-negative`                           |
| `--red` as border (`border*`, `box-shadow`, an outline that is not focus)    | `--semantic-color-border-negative`                         |
| `--red` as focus ring (an outline under `:focus`)                            | `--semantic-color-focus-ring-negative`                     |
| `--red` as background (`background*`, `accent-color`)                        | `--semantic-color-background-fill-negative`                |
| `--amber` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-warning`                 |
| `--green` as background (`background*`, `accent-color`)                      | `--semantic-color-background-fill-positive`                |
| `--on-status` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-on-status-fill`                     |
| `--on-red` as text (`color`, `caret-color`, `text-decoration-color`)         | `--semantic-color-text-on-negative-fill`                   |
| `--on-head` as text (`color`, `caret-color`, `text-decoration-color`)        | `--semantic-color-text-on-head`                            |
| `--term-red` as text (`color`, `caret-color`, `text-decoration-color`)       | `--semantic-color-text-terminal-red`                       |
| `--term-green` as text (`color`, `caret-color`, `text-decoration-color`)     | `--semantic-color-text-terminal-green`                     |
| `--term-yellow` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-terminal-yellow`                    |
| `--term-blue` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-terminal-blue`                      |
| `--term-magenta` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-terminal-magenta`                   |
| `--term-cyan` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-terminal-cyan`                      |
| `--code-keyword` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-code-keyword`                       |
| `--code-string` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-code-string`                        |
| `--code-number` as text (`color`, `caret-color`, `text-decoration-color`)    | `--semantic-color-text-code-number`                        |
| `--code-function` as text (`color`, `caret-color`, `text-decoration-color`)  | `--semantic-color-text-code-function`                      |
| `--code-type` as text (`color`, `caret-color`, `text-decoration-color`)      | `--semantic-color-text-code-type`                          |
| `--code-comment` as text (`color`, `caret-color`, `text-decoration-color`)   | `--semantic-color-text-code-comment`                       |
| `--veil` as background (`background*`, `accent-color`)                       | `--semantic-color-background-backdrop`                     |
| `--fade-on-ink`                                                              | `--semantic-number-opacity-muted-on-inverse-fill`          |
| `--fade-held`                                                                | `--semantic-number-opacity-disabled-on-inverse-fill`       |
| `--fade-dragged`                                                             | `--semantic-number-opacity-dragged`                        |
| `--font-px`                                                                  | `--semantic-font-family-ui`                                |
| `--font-body`                                                                | `--semantic-font-family-body`                              |
| `--font-code`                                                                | `--semantic-font-family-code`                              |
| `--read-weight`                                                              | `--semantic-font-weight-prose-heading`                     |
| `--type-label`                                                               | `--semantic-dimension-font-size-label`                     |
| `--type-state`                                                               | `--semantic-dimension-font-size-state`                     |
| `--type-control`                                                             | `--semantic-dimension-font-size-control`                   |
| `--type-body`                                                                | `--semantic-dimension-font-size-body`                      |
| `--type-name`                                                                | `--semantic-dimension-font-size-name`                      |
| `--type-title`                                                               | `--semantic-dimension-font-size-title`                     |
| `--type-page`                                                                | `--semantic-dimension-font-size-page`                      |
| `--type-page-narrow`                                                         | `--semantic-dimension-font-size-page-narrow`               |
| `--type-wordmark`                                                            | `--semantic-dimension-font-size-wordmark`                  |
| `--type-wordmark-wall`                                                       | `--semantic-dimension-font-size-wordmark-wall`             |
| `--type-figure`                                                              | `--semantic-dimension-font-size-figure`                    |
| `--type-figure-narrow`                                                       | `--semantic-dimension-font-size-figure-narrow`             |
| `--read-body`                                                                | `--semantic-dimension-font-size-prose-body`                |
| `--read-h3`                                                                  | `--semantic-dimension-font-size-prose-heading-3`           |
| `--read-h2`                                                                  | `--semantic-dimension-font-size-prose-heading-2`           |
| `--read-title`                                                               | `--semantic-dimension-font-size-prose-title`               |
| `--read-measure`                                                             | `--semantic-dimension-size-max-width-prose`                |
| `--tracking-caps`                                                            | `--semantic-dimension-letter-spacing-caps`                 |
| `--tracking-state`                                                           | `--semantic-dimension-letter-spacing-state`                |
| `--tracking-head`                                                            | `--semantic-dimension-letter-spacing-head`                 |
| `--tracking-title`                                                           | `--semantic-dimension-letter-spacing-title`                |
| `--tracking-label`                                                           | `--semantic-dimension-letter-spacing-label`                |
| `--line`                                                                     | `--semantic-dimension-border-width-container`              |
| `--hair`                                                                     | `--semantic-dimension-border-width-divider`                |
| `--row`                                                                      | `--semantic-dimension-size-row`                            |
| `--deck`                                                                     | `--semantic-dimension-size-max-width-deck`                 |
| `--rail`                                                                     | `--semantic-dimension-size-rail-default`                   |
| `--rail-drawer`                                                              | `--semantic-dimension-size-rail-drawer`                    |
| `--rail-folded`                                                              | `--semantic-dimension-size-rail-folded`                    |
| `--reel-column-min`                                                          | `--semantic-dimension-size-min-width-reel-column`          |
| `--reel-pane-min`                                                            | `--semantic-dimension-size-min-height-reel-pane`           |
| `--bench-work-min`                                                           | `--semantic-dimension-size-min-height-bench-work`          |
| `--bench-head-min`                                                           | `--semantic-dimension-size-min-height-bench-head`          |
| `--pad`                                                                      | `--semantic-dimension-space-padding-panel`                 |
| `--space-s`                                                                  | `--semantic-dimension-space-gap-inline`                    |
| `--space-m`                                                                  | `--semantic-dimension-space-gap-body`                      |
| `--space-l`                                                                  | `--semantic-dimension-space-gap-surface`                   |
| `--gap`                                                                      | `--semantic-dimension-space-gap-surface`                   |
| `--reel-gutter`                                                              | `--semantic-dimension-space-gap-reel`                      |
| `--shadow-card`                                                              | `--semantic-shadow-card`                                   |
| `--shadow-panel`                                                             | `--semantic-shadow-panel`                                  |
| `--shadow-button`                                                            | `--semantic-shadow-button-default`                         |
| `--shadow-button-small`                                                      | `--semantic-shadow-button-small`                           |
| `--shadow-pressed`                                                           | `--semantic-shadow-pressed`                                |
| `--shadow-danger`                                                            | `--semantic-shadow-negative`                               |
| `--motion-flash`                                                             | `--semantic-duration-flash`                                |
| `--motion-blink`                                                             | `--semantic-duration-blink`                                |
| `--motion-card`                                                              | `--semantic-duration-card`                                 |
| `--motion-veil`                                                              | `--semantic-duration-veil`                                 |
| `--toast-hold`                                                               | `--semantic-duration-toast-hold`                           |
| `--term-black`                                                               | removed: nothing used it                                   |
| `--chart-plot`                                                               | removed: nothing used it                                   |
| `--toast-hold`                                                               | removed: the hold is five seconds in `Toast`, not a style  |
| `--dither`, `--veil-grain`                                                   | unchanged, defined by `pixel-paper.css` from colour tokens |
