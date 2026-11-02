import { Checkbox as UiCheckbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a checkbox choice with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the name's and the note's ids are made from it. */
  id: string;
  /** The choice's name, in pixel caps. A click on it toggles the box. */
  label: string;
  /** A sans sentence under the name; it describes the box. */
  note?: string;
  isChecked: boolean;
  onToggle: (isChecked: boolean) => Message;
}>;

/** A checkbox with a pixel-caps name and an optional note, built on `@foldkit/ui`'s
 *  Checkbox: a `role="checkbox"` box (`aria-checked`) named by its name, described by its note
 *  (`aria-describedby`). Space and a click on the box or the name toggle it. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, note, isChecked, onToggle } = config;

  return UiCheckbox.view(
    {
      id,
      isChecked,
      onToggle,
      hasDescription: note !== undefined,
      toView: (groups) =>
        h.div(
          [h.Class("choice")],
          [
            h.button([...groups.checkbox, h.Class("choice-box")]),
            h.span(
              [],
              [
                h.span([...groups.label, h.Class("choice-name")], [label]),
                ...(note === undefined
                  ? []
                  : [
                      h.span(
                        [...groups.description, h.Class("choice-note")],
                        [note]
                      ),
                    ]),
              ]
            ),
          ]
        ),
    },
    h
  );
};
