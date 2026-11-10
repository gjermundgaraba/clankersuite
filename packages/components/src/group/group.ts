import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** Configuration for rendering a group with `view`. */
export type ViewConfig<Message> = Readonly<{
  body: ReadonlyArray<Html | string>;
  /** Further attributes for the line: `role="group"` and a name for a set of chips. Never a
   *  class. */
  attributes?: Attributes<Message>;
}>;

/** One line of components at the small gap, centred on each other, that never wraps: a name and its chip, a
 *  pair of buttons. When the line might not fit, use a Wrap. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { body, attributes = [] } = config;

  return h.div([...attributes, h.Class("gg-group gg-gap-s")], body);
};
