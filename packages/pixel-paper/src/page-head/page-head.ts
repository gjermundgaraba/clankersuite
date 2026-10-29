import type { Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a page head with `view`. */
export type ViewConfig = Readonly<{
  /** The screen's name: its `h1`, in sans. A long one wraps; nothing is cut. */
  title: string;
  /** A count or state after the title, in the pixel face ("12 items"). */
  meta?: string;
  /** The screen's own Buttons at the right; under the title on a phone. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** The heading of a working screen, above its panels: its name as the page's `h1`, a count
 *  beside it, and what the screen does. One per screen; the panels below it title in `h2`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { title, meta, actions = [] } = config;

  return h.div(
    [h.Class("page-head")],
    [
      h.div(
        [h.Class("page-name")],
        [
          h.h1([h.Class("page-title")], [title]),
          ...(meta === undefined ? [] : [h.span([h.Class("meta")], [meta])]),
        ]
      ),
      ...slotView("div", "page-acts", actions, h),
    ]
  );
};
