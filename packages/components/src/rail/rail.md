---
category: layout
---

# Rail

The page's sidebar: a labelled `aside` at the window's left, from under the top bar (or the window's top, where a page has none) to its bottom, flat on the sidebar's ground with a hairline at its right. Its head holds the wordmark and a search button, its body the places, section by section, scrolling on its own, and its foot the connection's state.

The rail is fixed to the window's left edge and wraps the page's `<main>`, so it shows in a page of its own: the [side pane's example](/frame/components/side-pane/workspace) has a rail beside its deck, with its splitter and, on a narrow window, its drawer.

## Usage

The rail is a Submodel. Its width is the application's: it keeps it from the rail's OutMessage and passes it back to the view. Lift `Rail.subscriptions(keyPrefix)` into the application's subscriptions, or a dragged splitter follows nothing.

```ts
const railFold = {
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, rail: Rail.Model): Model =>
    modifyFields(model, { rail: () => rail }),
  toParentMessage: (message: Rail.Message) => Message.GotRailMessage({ message }),
};

const foldRail = Update.foldChild({
  update: Rail.update,
  ...railFold,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail: ({ width }) => (model) => ({
      model: modifyFields(model, { maybeRailWidth: () => Option.some(width) }),
    }),
  }),
});
```

```ts
h.submodel({
  slotId: Rail.id(model.rail),
  model: model.rail,
  view: Rail.view,
  viewInputs: {
    label: "Places",
    maybeWidth: model.maybeRailWidth,
    toAsideView: () => ({
      head: [Wordmark.view({ label: "wtf" }, h), searchButton],
      body: [listsView, areasView],
      foot: [LinkState.view({ state: model.linkState, label: "Synced" }, h)],
    }),
    toDeckView: (openButton) => Deck.view({ body: [openButton, ...panels] }, h),
    toPaneView: () => paneView,
  },
  toParentMessage: (message) => Message.GotRailMessage({ message }),
})
```

`toPaneView` holds the page's [SidePane](/components/side-pane), or `h.empty` while it has none: the pane sits in the rail's page, so it can tell whether the room right of the rail holds it beside the page.

A page with a rail has no top bar: what the bar held, the wordmark and the tools (search is a quiet IconButton), goes in the rail's head, and the connection's state in its foot. The keys go in a StatusBar, which runs from the rail's edge.

## Sizing

Its splitter, on its right edge, sizes it by a pointer, previewed as it moves, or by the side arrows, within its bounds. It reports the width as `ResizedRail` for the application to keep, per client, and pass back as `maybeWidth`.

## The drawer

At 900px and under the rail leaves the page, and the button `toDeckView` receives, printed first in the deck, opens the same element as a drawer over a veil, a close glyph at the end of its head. Opening focuses its first control past the head. Escape, a press on the veil, the close glyph, focus leaving or the window growing past 900px closes it, and the first three put focus back on the button. A place picked in the drawer should close it: run `Rail.close` with the selection.

```ts
const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

SelectedCollection: ({ collection }) =>
  foldRailClose(modifyFields(model, { collection: () => collection })),
```

While the drawer is open, `Rail.isOpen` is true: pause the page's own keys.
