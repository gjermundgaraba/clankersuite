---
category: layout
---

# Status bar

The quiet line along the bottom of an interface: what state it is in at the left (a LinkState, a sync word, a count), and the keys worth knowing at the right, printed and not pressable. Narrow, the keys wrap under the state.

## Usage

Render one per page, after the rail and the deck and outside `<main>`, where its `<footer>` is the page's contentinfo landmark. It is fixed to the bottom of the window, so it has no example here: one would sit along the bottom of this page rather than in a frame.

```ts
StatusBar.view(
  {
    body: [LinkState.view({ state: "Reconnecting" }, h), "4 items"],
    keys: [
      { keys: "Mod+K", does: "commands" },
      { keys: "?", does: "keys" },
    ],
    platform: model.platform,
    toParentMessage: (message) => Message.GotStatusBarMessage({ message }),
  },
  h
)
```

Each key prints for the reader's keyboard, `⌘K` on Apple's and `Ctrl+K` elsewhere, so the key platform comes from the application's Model: detect it once with `KeyHint.detectKeyPlatform` in a Command from `init`. The keys are content, so a screen reader reads each one.

## Its height

While the bar is on the page, the page keeps `--gg-statusbar-h` at the bar's height however it wraps, so the page, the rail, a banner and the toasts stop above it. A Mount does this and reports a Message the parent lifts with `toParentMessage` and changes nothing for. In a Scene, resolve it by name: `Scene.Mount.resolve({ name: StatusBar.MeasureHeight.name }, toParentMessage(StatusBar.Message.CompletedMeasureHeight()))`.
