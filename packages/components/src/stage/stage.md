---
category: layout
---

# Stage

The ground itself, from under the top bar to the window's edges, for a canvas of windows. It does not scroll: what is on it pans.

## Usage

A stage is the page's main landmark, `<main id="main">`, the skip link's target, so it has no example here: this page already has its own.

```ts
Stage.view(
  {
    body: [canvasView(model, h), toolbarView(model, h)],
  },
  h
)
```

## Paused

While editing is paused (the link dropped, the page is read-only), `paused` holds a Notice that says why. A veil comes down over the work, which is inert until `paused` is cleared. The reason is inside a status (`role="status"`) that stays in place while the veil comes and goes, so a screen reader hears it.

```ts
Stage.view(
  {
    ...(model.isLinkDropped && {
      paused: [
        Notice.view(
          {
            title: "Editing paused",
            body: ["The link to the host dropped. Reconnecting now; nothing on the canvas is lost."],
          },
          h
        ),
      ],
    }),
    body: [canvasView(model, h)],
  },
  h
)
```
