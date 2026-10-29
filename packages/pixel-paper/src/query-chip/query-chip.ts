import { Input as UiInput } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** Configuration for rendering a query chip with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the search field's id. */
  id: string;
  /** The chip's name, which names the field: "find". */
  label: string;
  value: string;
  onInput: (value: string) => Message;
  placeholder?: string;
  /** Further attributes for the search field, the `<input>`, not the chip: its key handlers
   *  (a Mount that hears Escape), a description. Never a class. */
  inputAttributes?: Attributes<Message>;
}>;

/** A search field shaped as a chip, built on `@foldkit/ui`'s Input: a `type="search"` field
 *  named by the chip's name, tinted while it holds a query. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    onInput,
    placeholder,
    inputAttributes = [],
  } = config;

  return UiInput.view(
    {
      id,
      value,
      onInput,
      type: "search",
      ...(placeholder !== undefined && { placeholder }),
      toView: (groups) =>
        h.label(
          [
            ...groups.label,
            h.Class(value === "" ? "fchip query" : "fchip query live"),
          ],
          [
            h.span([h.Class("fchip-name")], [label]),
            h.input([...inputAttributes, ...groups.input]),
          ]
        ),
    },
    h
  );
};
