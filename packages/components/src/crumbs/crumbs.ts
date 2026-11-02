import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** One step of the path: its words, and where it links. */
export type Crumb = Readonly<{
  label: string;
  /** Every crumb but the last links up the path; the last is here. A crumb's link, else its
   *  words, is unique in the path. */
  href?: string;
}>;

/** Configuration for rendering crumbs with `view`. */
export type ViewConfig = Readonly<{
  crumbs: readonly Crumb[];
}>;

const crumbView =
  <Message>(lastIndex: number, h: HtmlBuilder<Message>) =>
  ({ label, href }: Crumb, index: number): Html =>
    h.keyed("li")(
      href ?? label,
      [],
      [
        href === undefined || index === lastIndex
          ? h.span(index === lastIndex ? [h.AriaCurrent("page")] : [], [label])
          : h.a([h.Href(href)], [label]),
      ]
    );

/** The path to where you are, in the pixel face, split by muted slashes: a navigation
 *  landmark named "Breadcrumb", its steps an ordered list, the last `aria-current="page"`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { crumbs } = config;

  return h.nav(
    [h.AriaLabel("Breadcrumb"), h.Class("crumbs")],
    [h.ol([], Array.map(crumbs, crumbView(crumbs.length - 1, h)))]
  );
};
