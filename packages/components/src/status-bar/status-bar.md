---
category: layout
---

# Status bar

The key bar along the bottom of an interface: the keys worth knowing, centred, each in a ringed box, printed and not pressable. It runs from a Rail's edge to a SidePane's, on the page's ground with a hairline above it. Beside a Rail, the connection's state goes in the rail's foot; without one, the bar can hold it at the left (a LinkState, a sync word, a count), the keys at the right, and narrow, the keys wrap under it.

## Usage

Render one per page, after the rail, the deck and the side pane and outside `<main>`, where its `<footer>` is the page's contentinfo landmark. It is fixed to the bottom of the window, so it shows in a page of its own: the [side pane's example](/frame/components/side-pane/workspace) ends in one.

```ts
StatusBar.view(
  {
    keys: [
      { keys: "J", otherKeys: ["K"], does: "move" },
      { keys: "X", does: "complete" },
      { keys: "Mod+K", does: "commands" },
    ],
    platform: model.platform,
    toParentMessage: (message) => Message.GotStatusBarMessage({ message }),
  },
  h
)
```

Each key prints for the reader's keyboard, `⌘K` on Apple's and `Ctrl+K` elsewhere, so the key platform comes from the application's Model: detect it once with `KeyHint.detectKeyPlatform` in a Command from `init`. The keys are content, so a screen reader reads each one. Keys that do the same share one note, the first in its box and the rest as words: `otherKeys: ["K"]` beside `J` prints J boxed, then "K move". Arrows share one box: `ArrowUp` with `otherKeys: ["ArrowDown"]` prints ↑↓.

## Its height

While the bar is on the page, the page keeps `--gg-statusbar-h` at the bar's exact height, border to border, however it wraps or an application pads it, so the page, a Bench, a Stage and the toasts stop at its top edge. A Mount does this and reports a Message the parent lifts with `toParentMessage` and changes nothing for. In a Scene, resolve it by name: `Scene.Mount.resolve({ name: StatusBar.MeasureHeight.name }, toParentMessage(StatusBar.Message.CompletedMeasureHeight()))`.
