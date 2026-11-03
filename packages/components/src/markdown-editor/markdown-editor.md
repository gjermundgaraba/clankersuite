---
category: forms
---

# Markdown editor

A labelled Markdown field, edited in place: its marks show only around the caret, and the text it hands back is the Markdown as typed. It needs `defineMarkdownEditorElement()` from `@gjermundgaraba/components/markdown-editor/element`, called once when the application starts. Without it, and in tests, it is a plain `TextareaField`.

::Example{name="brief"}

## Reading

`readView` shows a stored Markdown document in the editor's look, with every mark hidden and nothing to edit. Only its links take focus, and they open in a new tab when the link policy allows their target.

::Example{name="read"}
