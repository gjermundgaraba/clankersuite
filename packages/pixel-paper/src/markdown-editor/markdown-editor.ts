import { Schema } from "effect";
import { define } from "foldkit/customElement";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as TextareaField from "../textarea-field/textarea-field.ts";

/** The binding to `<pp-markdown-editor>`. The property is `source`, not `value`, because
 *  Foldkit's props module skips a `value` write when the element's `value` already matches. */
export const spec = define({
  tag: "pp-markdown-editor",
  properties: { source: Schema.String },
  events: { "value-change": Schema.Struct({ value: Schema.String }) },
});

/** Configuration for rendering a Markdown editor with `view`. */
export type ViewConfig<Message> = Pick<
  TextareaField.ViewConfig<Message>,
  | "id"
  | "label"
  | "value"
  | "onInput"
  | "help"
  | "error"
  | "isRequired"
  | "rows"
>;

/** A labelled Markdown field, edited in place: its marks show only around the caret, and the
 *  text it hands back is the Markdown string, untouched where nobody typed. Without
 *  `defineMarkdownEditorElement` it is a plain `TextareaField`, which is also what tests see.
 *  With it, the element takes the textarea's place and drives `onInput` itself, because a
 *  textarea cannot carry a CRLF document. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const host = spec.withMessage(h);

  return host(
    [
      host.Source(config.value),
      host.OnValueChange(({ value }) => config.onInput(value)),
    ],
    [TextareaField.view(config, h)]
  );
};
