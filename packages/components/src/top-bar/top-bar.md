---
category: navigation
---

# Top bar

The sticky paper bar across the top of an interface, closed by a 2px ink rule: the brand at the left, then a NavStrip, then the tools. This site's own top bar is one.

::Example{name="brand-nav-tools"}

## Usage

Render one per page, after the skip link and before the page's `<main>`, where its `<header>` is the page's banner landmark. On a phone the nav strip drops to a full-width strip under the brand, and the tools wrap as one group.

```ts
body: [
  SkipLink.view(h),
  TopBar.view(
    {
      brand: [Wordmark.view({ label: "ledger" }, h)],
      nav: [NavStrip.view({ label: "Sections", items }, h)],
      tools: [LinkState.view({ state: model.linkState }, h)],
      toParentMessage: (message) => Message.GotTopBarMessage({ message }),
    },
    h
  ),
  Deck.view({ body: [...] }, h),
]
```

## Its height

The page's first top bar keeps `--topbar-h` on the page's root at its height however it wraps, so anchors land clear of it. It does this through a Mount, which reports a Message the parent lifts with `toParentMessage` and changes nothing for. A top bar shown inside a page, as above, leaves the property alone. In a Scene, resolve the Mount with `Scene.Mount.resolveAll(...TopBar.sceneMounts(toParentMessage))`.
