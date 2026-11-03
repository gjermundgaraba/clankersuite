---
category: layout
---

# Deck

The body of a page: a centred column of panels, 24px apart, a PageHead first. This page sits in one.

## Usage

A deck is the page's main landmark, `<main id="main">`, the skip link's target, so it has no example here: a second one inside this page would be a second `<main>`. Render it after the top bar.

```ts
body: [
  SkipLink.view(h),
  TopBar.view({ ... }, h),
  Deck.view(
    {
      body: [
        PageHead.view({ title: "Field notes", meta: "12 items" }, h),
        Panel.view({ id: "queue", title: "queue", body: [...] }, h),
      ],
    },
    h
  ),
]
```

Beside a Rail, the deck is what the rail's `toDeckView` returns, with the rail's open button first in it.
