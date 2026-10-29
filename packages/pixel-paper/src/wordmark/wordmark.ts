import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a wordmark with `view`. */
export type ViewConfig = Readonly<{
  /** The name, as printed. */
  label: string;
  /** A link home; without it the wordmark is plain text. */
  href?: string;
}>;

/** A name set in the pixel face, followed by a block cursor that blinks four times. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, href } = config;
  const rootClass = h.Class("wordmark");
  const children = [label, h.span([h.Class("cursor"), h.AriaHidden(true)])];

  return href === undefined
    ? h.span([rootClass], children)
    : h.a([h.Href(href), rootClass], children);
};
