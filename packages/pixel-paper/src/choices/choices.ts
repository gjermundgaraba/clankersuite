import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a list of choices with `view`. */
export type ViewConfig = Readonly<{
  /** Choices. */
  body: ReadonlyArray<Html | string>;
  /** Side by side while they fit, then onto the next line. */
  isInline?: boolean;
}>;

/** A stack of checkbox Choices; put it in a Fieldset, which names the group. A choice of one
 *  is a RadioChoices. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, isInline = false } = config;

  return h.div([h.Class(isInline ? "choices inline" : "choices")], body);
};
