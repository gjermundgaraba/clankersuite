import { Schema } from "effect";
import { define } from "foldkit/customElement";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import * as Prose from "../prose/prose.ts";
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
  "id" | "label" | "value" | "onInput" | "help" | "error" | "rows"
>;

/** A labelled Markdown field, edited in place: its marks show only around the caret, and the
 *  text it hands back is the Markdown string as typed, except that the first edit turns CRLF
 *  line endings into LF. Without `defineMarkdownEditorElement` it is a plain `TextareaField`,
 *  which is also what tests see, and so is a field whose editor fails to mount. With it, the
 *  element takes the textarea's place and drives `onInput` itself. */
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

/** Configuration for showing a Markdown document with `readView`. */
export type ReadViewConfig<Message> = Readonly<{
  value: string;
  /** Further attributes for the `<pp-markdown-editor>` element, such as an id or a label. */
  attributes?: Attributes<Message>;
}>;

/** A Markdown document shown on a page, drawn by the editor's engine with every mark hidden.
 *  Nothing in it takes focus but its links, which open in a new tab when the link policy
 *  allows their target. Without `defineMarkdownEditorElement` it is the source in a Prose
 *  block, line breaks kept, which is also what tests see. */
export const readView = <Message>(
  config: ReadViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const host = spec.withMessage(h);

  return host(
    [...(config.attributes ?? []), host.Source(config.value)],
    [Prose.view({ body: [h.p([], [config.value])] }, h)]
  );
};
