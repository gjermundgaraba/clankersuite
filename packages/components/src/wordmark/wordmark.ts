import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a wordmark with `view`. */
export type ViewConfig = Readonly<{
  /** The name, as printed. */
  label: string;
  /** A link home; without it the wordmark is plain text. */
  href?: string;
}>;

/** A name set in the brand face. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, href } = config;
  const rootClass = h.Class("gg-wordmark");

  return href === undefined
    ? h.span([rootClass], [label])
    : h.a([h.Href(href), rootClass], [label]);
};
