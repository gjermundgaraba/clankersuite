---
category: navigation
---

# Tabs

The nav strip at tab size over one panel of several. Which tab is selected is the application's: it keeps the value a `Selected` OutMessage reports and passes it back as `selectedValue`. The panel, `div.gg-tab-panel`, holds what `toPanelView` returns; a page that pads it targets that class.

::Example{name="states"}

## Keys

Only the selected tab is in the Tab order. The side arrows move and select, wrapping at the ends, and Home and End go to the first and last tab.
