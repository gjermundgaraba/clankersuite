---
category: plumbing
---

# Live region

The page's live parts: the one polite region where `Announcer.Announce` speaks, and the toast stack beside it. An open dialog makes the page outside it inert and hidden from screen readers, so `LiveRegion.place` puts the parts inside the topmost open dialog, and at the end of the body while none is open, exactly once either way. Call it on every render, from the application's Model; [Setup](/components/setup) shows where its two halves go.

## Moving into a dialog

Sync from the page and the toast rises from the end of the body. Open the settings and save: while the dialog is open the parts render inside it, so the toast shows above the veil and the keyboard can reach it. They move back when it closes.

::Example{name="dialog"}

## The topmost dialog

List every dialog that can host the parts, from the bottom of the stack to the top: one that opens from another, a confirm from a form, comes after it. Of the open ones the last is the topmost, and only its `toDialogView` returns the parts. Neither half builds them until it is called, so the toast stack is built once.

```ts
const liveParts = LiveRegion.place(
  [
    ["Rename", Dialog.isOpen(model.rename)],
    ["Delete", ConfirmDialog.isOpen(model.deleteConfirm)],
  ],
  () => LiveRegion.view({ toasts: toastsView(model, h) }, h)
);

// the rename dialog's viewInputs: toLiveRegionView: liveParts.toDialogView("Rename")
// the end of the body: ...liveParts.toPageView()
```
