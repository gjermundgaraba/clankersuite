import type { Html, HtmlBuilder } from "foldkit/html";

export type ViewConfig = Readonly<{
  /** A PageHead first, then the page's groups and panels. */
  body: ReadonlyArray<Html | string>;
}>;

/** The page body: a centred column, its head then its groups and panels, `space.gutter` apart.
 *  It is the main landmark (`<main id="main">`), the skip link's target. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.main([h.Id("main"), h.Class("gg-deck")], body);
};
