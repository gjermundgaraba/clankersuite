import { Nav as UiNav } from "@foldkit/ui";
import { Array, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";

/** One segment of the strip: a link. */
export type NavItem = Readonly<{
  href: string;
  label: string;
  /** A count on the head tint after the label. */
  count?: number;
  isCurrent?: boolean;
}>;

/** Configuration for rendering a nav strip with `view`. */
export type ViewConfig = Readonly<{
  /** Names the navigation for screen readers. */
  label: string;
  items: readonly NavItem[];
}>;

const countView = <Message>(
  count: number,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  h.span([h.Class("sr-only")], [" "]),
  h.span([h.Class("navnum")], [count.toLocaleString(LOCALE)]),
];

const linkView = <Message>(
  info: UiNav.ItemInfo,
  { label, count }: NavItem,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("a")(info.value, info.link, [
    label,
    ...(count === undefined ? [] : countView(count, h)),
  ]);

/** One ink-bordered strip of link segments, built on `@foldkit/ui`'s Nav: a navigation
 *  landmark named by its label, the current page `aria-current="page"` and printed inverted.
 *  Its links route through the application as every link does. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, items } = config;

  return UiNav.view({
    items: Array.map(items, ({ href }) => href),
    ariaLabel: label,
    toHref: (href) => href,
    isItemCurrent: (_href, index) =>
      Option.exists(
        Array.get(items, index),
        ({ isCurrent = false }) => isCurrent
      ),
    toView: (render) =>
      h.nav(
        [...render.nav, h.Class("nav")],
        Array.zipWith(render.items, items, (info, item) =>
          linkView(info, item, h)
        )
      ),
  });
};
