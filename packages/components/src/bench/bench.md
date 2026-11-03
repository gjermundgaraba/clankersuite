---
category: layout
---

# Bench

A page whose work is the window: its head at its own height, then the work in all the height left, from under the top bar to the window's bottom and edge to edge (beside a Rail, from the rail's edge). For a workspace of windows in a Reel.

## Usage

A bench is the page's main landmark, `<main id="main">`, the skip link's target, so it has no example here: this page already has its own.

```ts
Bench.view(
  {
    head: [
      openButton,
      PageHead.view({ title: "Write the brief", meta: "in progress" }, h),
      Notice.view({ title: "Behind main", body: ["Two commits landed on main."] }, h),
    ],
    body: [
      h.submodel({ slotId: model.reel.id, model: model.reel, view: Reel.view, ... }),
      stopConfirmView(model, h),
    ],
  },
  h
)
```

The head holds a PageHead, notices and a Rail's open button. The body is the work, never shorter than `--semantic-dimension-size-min-height-bench-work`: a Reel, which fills it, and the page's dialogs.

## Scrolling

The page does not scroll. The work scrolls itself where it must, as a reel's columns scroll sideways, and on a short window the head scrolls in what the work's floor leaves it.
