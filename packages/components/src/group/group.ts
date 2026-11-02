import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a group with `view`. */
export type ViewConfig = Readonly<{
  body: ReadonlyArray<Html | string>;
}>;

/** One line of components at the small gap, centred on each other, that never wraps: a name and its chip, a
 *  pair of buttons. When the line might not fit, use a Wrap. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.div([h.Class("group gap-s")], body);
};
