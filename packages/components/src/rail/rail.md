---
category: layout
---

# Rail

A column of panels beside the deck, fixed under the top bar: a tree, places, filters. What comes before its last panel keeps its height, and the last panel shrinks to the room left, its bar and foot staying while its body scrolls.

The rail is fixed to the window's left edge and wraps the page's `<main>`, so it has no example here: one would cover this site's navigation.

## Usage

The rail is a Submodel. Its width and whether the reader folded it are the application's: it keeps them from the rail's OutMessages and passes them back to the view. Lift `Rail.subscriptions(keyPrefix)` into the application's subscriptions, or a dragged splitter follows nothing.

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
    ToggledRail: () => (model) => ({
      model: modifyFields(model, { isRailHidden: (isHidden) => !isHidden }),
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
    label: "collections",
    maybeWidth: model.maybeRailWidth,
    isHidden: model.isRailHidden,
    maybeToggleKeyHint: Option.none(),
    toAsideView: (toggle) => [
      Panel.view({ id: "collections", title: "Home", lead: [toggle], isFlush: true, body: [placesView] }, h),
    ],
    toDeckView: (openButton) => Deck.view({ body: [openButton, ...panels] }, h),
  },
  toParentMessage: (message) => Message.GotRailMessage({ message }),
})
```

## Folding

The rail's toggle comes to `toAsideView` to print as its first panel's `lead`. Pressed, it reports `ToggledRail`: the rail folds to that panel's title bar, stood on end, the rest of it and its splitter gone, and the deck takes the width. Pressed again, it unfolds. Bind a key of the application's to `Rail.toggle`, and pass it as `maybeToggleKeyHint` so the toggle's tip prints it.

## Sizing

Its splitter, on its right edge, sizes it by a pointer, previewed as it moves, or by the side arrows, within its bounds. It reports the width as `ResizedRail` for the application to keep, per client, and pass back as `maybeWidth`.

## The drawer

At 900px and under the rail leaves the page, and the button `toDeckView` receives, printed first in the deck, opens the same element as a drawer over a veil. Opening focuses its first control. Escape, a press on the veil, the close glyph, focus leaving or the window growing past 900px closes it, and the first three put focus back on the button. A place picked in the drawer should close it: run `Rail.close` with the selection.

```ts
const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

SelectedCollection: ({ collection }) =>
  foldRailClose(modifyFields(model, { collection: () => collection })),
```

While the drawer is open, `Rail.isOpen` is true: pause the page's own keys.
