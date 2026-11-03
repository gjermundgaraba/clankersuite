---
category: forms
---

# Error summary

Why a form was not sent, above its fields: an error notice with a headline that counts the failed fields and a link to each. Render it from the errors found at the last submit, not from live state, and mark the same fields invalid. It holds still while they are put right, until the next submit.

It is no live region. At every failed submit the form's update returns `Focus` with the summary's id, which moves focus to it and so reads it.

## A form

Save the form empty: the summary takes focus and links to each failed field, which wears red. Fill it in and save: while it saves, every control is held at once, and the save button is busy.

::Example{name="form"}
