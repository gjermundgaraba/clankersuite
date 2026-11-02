import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a field grid with `view`. */
export type ViewConfig = Readonly<{
  /** Fields. */
  body: ReadonlyArray<Html | string>;
}>;

/** Fields side by side while they fit, 160px at least each. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.div([h.Class("field-grid")], body);
};
