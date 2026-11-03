---
order: 3
---

# Type

Three families: the pixel font for every control, label and title, the system sans for body text, and the system mono for code. Two scales: the working scale for the chrome, and the reading scale, `prose-*`, for documents.

## Families

`ui` is Departure Mono, from [`@gjermundgaraba/fonts`](/fonts/departure-mono).

::Tokens{prefix="--semantic-font-family"}

## Sizes

Each size is shown in the voice it is used in.

::Tokens{prefix="--semantic-dimension-font-size"}

## The reading scale at work

Prose is the one place the system slows down: the reading sizes, the system sans, and the reading measure.

::Example{name="reading-scale"}

## Weights

::Tokens{prefix="--semantic-font-weight"}

## Tracking

Pixel caps are tracked out; large titles are tracked in.

::Tokens{prefix="--semantic-dimension-letter-spacing"}

## Line heights

::Tokens{prefix="--semantic-number-line-height"}

## Inline code

Code inside a sentence is set at this fraction of the text around it.

::Tokens{prefix="--semantic-number-font-scale"}
