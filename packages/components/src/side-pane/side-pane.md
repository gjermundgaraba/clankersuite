---
category: layout
---

# Side pane

A column of panels at the page's right: the details of what the page has chosen, such as the task picked in a list. It is fixed between the top bar and the status bar as a Rail is at its left, on the same rule, so both follow the bars' real edges however tall they are. While it is there the page keeps its width clear, and toasts rise left of it. It is a complementary landmark (`<aside>`) named by its `label`, and its contents are the application's.

## Showing it

The application renders the pane in the Rail's `toPaneView` while it has something to show, and `h.empty` otherwise: its contents come from the model, so whether it shows does too. A close glyph in its contents, or picking something else, changes the model. It is not resizable: it holds details at one width, and the deck beside it is what the reader sizes, through the rail.

```ts
toPaneView: () =>
  Option.match(model.maybeTask, {
    onNone: () => h.empty,
    onSome: (task) =>
      SidePane.view(
        {
          label: "Task details",
          body: [Panel.view({ id: "task", title: task, actions: [closeButton], body: [h.p([], [DETAILS[task]])] }, h)],
        },
        h
      ),
  })
```

## Narrow windows

Where the room right of the rail is narrower than the pane and the narrowest deck together (781px), whatever the rail's width, the pane covers the page between the bars from the rail's right edge (the window's left, where the rail is a drawer), and the page under it (a Deck, a Bench or a Stage) is hidden until the pane goes, but a dialog opened in place in it still shows. The pane measures that room from inside the Rail's page, which is why it goes in `toPaneView`, and the application needs no breakpoint of its own for it.

## A page with a rail and a side pane

The pane is fixed to the window, so this example runs as a page of its own, in a frame, with a top bar, a Rail and a status bar around it.

::Page{name="workspace"}
