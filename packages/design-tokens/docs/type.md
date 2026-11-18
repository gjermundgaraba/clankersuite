---
order: 3
---

# Type

Three families: Inter for every control, label, title and body text, Departure Mono for the wordmark, and the system mono for code. Two scales: the working scale for the chrome, and the reading scale, `prose-*`, for documents.

## Families

`ui` is [Inter](/fonts/inter) and `brand` is [Departure Mono](/fonts/departure-mono), both from `@gjermundgaraba/fonts`.

::Tokens{prefix="--semantic-font-family"}

## Sizes

Each size is shown in the voice it is used in.

::Tokens{prefix="--semantic-dimension-font-size"}

## The reading scale at work

Prose sets body text on a looser line, held to the reading measure, with its own heading sizes.

::Example{name="reading-scale"}

## Weights

::Tokens{prefix="--semantic-font-weight"}

## Tracking

Labels are set as written, untracked. Large titles and headings are tracked in, the wordmark most; a secret's characters are tracked out, so each reads apart.

::Tokens{prefix="--semantic-dimension-letter-spacing"}

## Line heights

::Tokens{prefix="--semantic-number-line-height"}

## Inline code

Code inside a sentence is set at this fraction of the text around it.

::Tokens{prefix="--semantic-number-font-scale"}
