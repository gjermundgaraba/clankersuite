import { Fieldset as UiFieldset } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a fieldset with `view`. */
export type ViewConfig = Readonly<{
  /** Unique in the document: the legend's id is made from it. */
  id: string;
  /** The group's name, in the legend. */
  label: string;
  /** The controls: Choices, a Segmented. */
  body: ReadonlyArray<Html | string>;
}>;

/** A group of controls under one name, built on `@foldkit/ui`'s Fieldset: a `<fieldset>`
 *  named by its `<legend>`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, body } = config;

  return UiFieldset.view(
    {
      id,
      toView: (groups) =>
        h.fieldset(
          [...groups.fieldset, h.Class("field")],
          [
            h.legend([...groups.legend, h.Class("field-label")], [label]),
            ...body,
          ]
        ),
    },
    h
  );
};
