---
category: forms
---

# Markdown editor

A labelled Markdown field, edited in place: its marks show only around the caret, and the text it hands back is the Markdown as typed. It needs `defineMarkdownEditorElement()` from `@gjermundgaraba/components/markdown-editor/element`, called once when the application starts. Without it, and in tests, it is a plain `TextareaField`.

::Example{name="brief"}

## In place

Where its place says what it is, such as a side pane's notes under their rule, `isLabelHidden` keeps the label as its name but out of sight, and a `placeholder` shows quiet while it is empty. Such an editor is as tall as its `rows` and shows its rule only while it has focus; the side pane's page shows one. The values quote on a goals page goes further and reads its editor as the quote's own text, with no rule, the quote's line height and the focus outline; the goal card's page shows it.

## Reading

`readView` shows a stored Markdown document in the editor's look, with every mark hidden and nothing to edit. Only its links take focus, and they open in a new tab when the link policy allows their target.

::Example{name="read"}
