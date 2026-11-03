---
category: layout
---

# Wall

The whole viewport as dithered ground with one card centred on it, for a screen with nothing else on it: sign-in, consent, first-run setup.

## Usage

A wall is a page's main landmark, `<main id="main">`, the skip link's target, so it has no example here: this page already has its own. Render it in a deck's place, with no top bar, after the skip link.

```ts
body: [
  SkipLink.view(h),
  Wall.view({ body: [signInCardView(model, h)] }, h),
]
```

## Its mark

`Wall.markView` prints the wordmark at wall size beside the lock in a box: the top of a wall's card.

::Example{name="mark"}
