---
category: plumbing
---

# Focus

A Command that moves the keyboard to the element with an id, once it is in the page, and does nothing when it is not. Return it from `update` when what the reader did puts a control in front of them: a failed submit focuses its `ErrorSummary`, an inline edit that ends by Enter or Escape gives focus back to the button that began it.

It reports `CompletedFocus`: put `CompletedFocus: {}` in the application's Message union, and change nothing for it.

::Example{name="reveal"}
