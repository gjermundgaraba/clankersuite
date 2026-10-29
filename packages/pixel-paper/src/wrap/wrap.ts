import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** Configuration for rendering a wrap with `view`. */
export type ViewConfig<Message> = Readonly<{
  body: ReadonlyArray<Html | string>;
  /** Further attributes for the line: `role="group"` and a name for a set of chips. Never a
   *  class. */
  attributes?: Attributes<Message>;
}>;

/** A line of buttons or chips that wraps onto the next line when it runs out of room, the
 *  same small gap across and down. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { body, attributes = [] } = config;

  return h.div([...attributes, h.Class("wrap gap-s")], body);
};
