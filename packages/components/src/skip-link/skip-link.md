---
category: navigation
---

# Skip link

The first thing in the page: a link to the main landmark, hidden until it holds the keyboard. This site's own is one: load a page and press Tab.

## Usage

Render it before the top bar. It links to `#main`, the id Deck, Bench, Stage and Wall give their `<main>`.

```ts
body: [
  SkipLink.view(h),
  TopBar.view({ ... }, h),
  Deck.view({ body: [...] }, h),
]
```

## Moving focus

A Foldkit application routes every link click through its own update, so following the link changes the URL and nothing more. Return `ScrollToFragment` when the URL changes: it scrolls to the element the fragment names and moves focus to it, as the browser would, so the next Tab continues from there. Without a fragment it scrolls to the top. Put `CompletedScrollToFragment: {}` in the application's Message union.

```ts
ChangedUrl: ({ url }) => ({
  model: modifyFields(model, { route: () => urlToAppRoute(url) }),
  commands: [SkipLink.ScrollToFragment({ maybeFragment: url.hash })],
}),
CompletedScrollToFragment: () => ({ model }),
```
