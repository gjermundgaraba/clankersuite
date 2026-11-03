---
category: overlays
---

# Tips

The page's one tip: it shows the words of any control carrying `data-tip`, which is the control's accessible name, then its key where it has one. An icon button, a menu's glyph toggle, a chip dot and a mark all carry one.

## Rest or Tab

Rest the pointer on a glyph button, or reach it with Tab: the tip says its name. It opens on a resting pointer after a moment, at once while another has just closed, and never on touch. It can be hovered; leaving, blur, a press or any key closes it, and Escape closes the tip and nothing else.

::Example{name="tips"}

## One per page

Render it once, beside the live region, and lift `Tips.subscriptions` into the application's Subscriptions with a key prefix no other record on the page uses. The tip says its control's name and nothing more, so it stays out of the accessibility tree.
