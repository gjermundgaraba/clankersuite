import { Textarea as UiTextarea } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a code editor with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the `<textarea>`'s id. */
  id: string;
  /** The code. The caller keeps it, and sets it again for a reset or a loaded file. */
  value: string;
  /** Every keystroke's whole code; the caller stores it as `value`. */
  onInput: (value: string) => Message;
  /** Names the editor for screen readers: a file name, `"Request body"`. */
  label: string;
}>;

/** Code to edit, built on `@foldkit/ui`'s Textarea: the code surface as a textarea, 220px tall
 *  at least and growing to 60vh, with spelling, capitals and autocomplete off. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { id, value, onInput, label } = config;

  return UiTextarea.view(
    {
      id,
      value,
      onInput,
      toView: (groups) =>
        h.textarea([
          ...groups.textarea,
          h.Spellcheck(false),
          h.Autocapitalize("off"),
          h.Autocomplete("off"),
          h.AriaLabel(label),
          h.Class("code-surface"),
        ]),
    },
    h
  );
};
