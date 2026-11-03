---
category: status
---

# Banner

A printed slip fixed at the bottom centre of the window, above the status bar: a state the whole interface is in (offline, reconnecting, read-only), for as long as it lasts. One at a time. An outcome that comes and goes is a Toast; a word beside the control that did it is a FlashWord.

## Reconnecting

Drop the link and the banner prints at the bottom of the window, as it does in an application, with a control at its right. Retry, and an `Ok` banner says the state ended, briefly, before it is taken away.

::Example{name="reconnecting"}

## Tones

| Tone                 | For                                                                               |
| -------------------- | --------------------------------------------------------------------------------- |
| `Error`, the default | red: a state that stops work, such as offline                                     |
| `Warn`               | amber: a state that is passing, such as reconnecting                              |
| `Ok`                 | ink: the state just ended, such as back online, shown briefly and then taken away |
| `Quiet`              | tinted: news                                                                      |

## Saying it

A banner is not a live region: it arrives already holding its sentence, which would go unheard. The application says the state once, when it begins, with the `Announcer.Announce` Command, through the page's live region.
