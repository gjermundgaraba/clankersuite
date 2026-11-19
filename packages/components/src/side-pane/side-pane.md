---
category: layout
---

# Side pane

A column at the page's right, 400px wide: the details of what the page has chosen, such as the task picked in a list. It runs from under the top bar, or the window's top where a page has none, to the window's bottom, as a Rail does at its left, on the surface with a hairline at its left edge, and the key bar ends at its edge. Nothing inside it is boxed: its `top` line says where the item lives, holds a quiet Menu of what else can be done to it (`menu`) and closes the pane, `titleView` prints a row's check beside a TitleField, a flat PropsList holds the properties as quiet buttons that open menus, a date (`PropsList.dateView`) or an InlineInput, `notesView` sets the notes under a rule, as a MarkdownEditor with its label hidden and a placeholder, and the subtasks are a compact Rows section (`isCompact`) with an add row, flush with the properties. While it is there the page keeps its width clear, and toasts rise left of it. It is a complementary landmark (`<aside>`) named by its `label`.

## Showing it

The application renders the pane in the Rail's `toPaneView` while it has something to show, and `h.empty` otherwise: its contents come from the model, so whether it shows does too. The close glyph in its top line, or picking something else, changes the model, and so can Escape: `onEscape` is sent for an Escape in the pane that nothing inside it took, so an Escape that ends an InlineInput's edit or closes a Menu's slip does only that. A Mount listens for it, and reports first that it started, which `toParentMessage` lifts and the parent's update changes nothing for. In a Scene, resolve it by name with that Message, never with `onEscape`: `Scene.Mount.resolve({ name: SidePane.BindEscape.name }, toParentMessage(SidePane.Message.CompletedBindEscape()))`. It is not resizable: it holds details at one width, and the deck beside it is what the reader sizes, through the rail.

```ts
toPaneView: () =>
  Option.match(model.maybeTask, {
    onNone: () => h.empty,
    onSome: (task) =>
      SidePane.view(
        {
          label: "Task details",
          top: {
            context: [Marker.view({ colour: "Amber" }, h), "Work"],
            menu: moreMenu,
            closeLabel: "Close the details",
            onClose: Message.ClickedClosePane(),
          },
          body: [
            SidePane.titleView({ check, title: titleField }, h),
            PropsList.view({ isFlat: true, items: properties }, h),
            SidePane.notesView(
              {
                body: [
                  MarkdownEditor.view(
                    {
                      id: "task-notes",
                      label: "Notes",
                      isLabelHidden: true,
                      value: model.notes,
                      onInput: (value) => Message.UpdatedNotes({ value }),
                      rows: 1,
                      placeholder: "Notes, in Markdown…",
                    },
                    h
                  ),
                ],
              },
              h
            ),
            subtasks,
          ],
        },
        h
      ),
  })
```

## Narrow windows

Where the room right of the rail is narrower than the pane and the narrowest deck together (821px), whatever the rail's width, the pane covers the page from the rail's right edge (the window's left, where the rail is a drawer) down to the key bar's top edge, so the rail and the key bar stay in sight and nothing in the pane sits under the key bar. The page under it (a Deck, a Bench or a Stage) is hidden until the pane goes, but a dialog opened in place in it still shows. The pane measures that room from inside the Rail's page, which is why it goes in `toPaneView`, and the application needs no breakpoint of its own for it.

## A page with a rail and a side pane

The pane is fixed to the window, so this example runs as a page of its own, in a frame, beside a Rail and over a StatusBar of keys.

::Page{name="workspace"}
