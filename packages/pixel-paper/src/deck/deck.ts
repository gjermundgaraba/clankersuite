import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a deck with `view`. */
export type ViewConfig = Readonly<{
  /** The panels, a PageHead first. */
  body: ReadonlyArray<Html | string>;
}>;

/** The page body: a centred column of panels, 24px apart. It is the main landmark
 *  (`<main id="main">`), the skip link's target. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.main([h.Id("main"), h.Class("deck")], body);
};
