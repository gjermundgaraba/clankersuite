import type { Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a sheet with `view`. */
export type ViewConfig = Readonly<{
  /** The page's `h1`, in sans at the reading scale. */
  title: string;
  /** Pixel face, muted, over a 1px rule: who changed it and when. */
  byline?: ReadonlyArray<Html | string>;
  /** Buttons at the title's right: edit, history. */
  actions?: ReadonlyArray<Html | string>;
  /** A Prose, and anything under it. */
  body: ReadonlyArray<Html | string>;
}>;

/** An authored page, an `<article>` under its `h1` on its own sheet of paper, framed as a
 *  panel is: the one place the system slows to reading pace. It stands in a panel's place,
 *  never inside one, so its `h1` opens the page instead of following a panel's `h2`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { title, byline = [], actions = [], body } = config;

  return h.article(
    [h.Class("sheet")],
    [
      h.div(
        [h.Class("sheet-head")],
        [
          h.h1([h.Class("sheet-title")], [title]),
          ...slotView("div", "sheet-acts", actions, h),
        ]
      ),
      ...slotView("p", "byline", byline, h),
      ...body,
    ]
  );
};
