---
category: forms
---

# Field

A labelled text input with its help line. The input is a baseline that thickens in the accent on focus. The label names it and the help line describes it.

::Example{name="help"}

## Error

Why the value was refused: a red sentence under the input, which describes it, with red on its rule and its label (`aria-invalid`). A required field says so to screen readers (`aria-required`). Say the error again in an `ErrorSummary` above the form, from the errors found at the last submit.

::Example{name="error"}

## Mono

Code and identifiers, such as a file's name, print in the system monospace.

::Example{name="mono"}

## Boxed

`look: "Box"` draws a box, for the field that is the whole job of its form. A date is always boxed.

::Example{name="boxed"}

## A sheet's line, marks and suggestions

`look: "Sheet"` is the tall borderless line across a sheet's top, in title-size text and ruled under, that a quick capture and the command palette are typed in; `lead` puts a back button or a scope before the input on it. A Card takes it as its `head`.

`marks` underline spans of the value, such as the words a parser took as a date (`Warning`), a goal (`Accent`) or a parent task (`Link`); they are for the eye, so say what they mean elsewhere too. `suggestions` make the field a combobox over a sunken list of options, each a title over its context, named "title, context". Focus stays in the field: its own keys, passed in `inputAttributes`, move `activeId` and pick, and a click picks too and leaves focus in the field. That takes a Mount on the list, `Field.BindSuggestions`, whose lifecycle Message `suggestions.toParentMessage` lifts; a Scene resolves it by name while the list shows. Here a quick capture's sheet: type after an `@` to find a task to put it under.

::Example{name="capture"}
