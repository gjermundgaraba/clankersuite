import type { Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a panel with `view`. */
export type ViewConfig = Readonly<{
  /** Unique in the document: the title's id is made from it, and names the panel. It is the
   *  panel's key too, so a panel among siblings that come and go keeps its own element, and
   *  a panel with a different id is a different element: one that replaces another in the
   *  same place is built anew, live regions and all. To keep an element across states, render
   *  one panel under one id. */
  id: string;
  /** Pixel caps in the inverted title bar. */
  title: string;
  /** What screen readers call the panel where its title repeats among its siblings (panels
   *  titled by a kind, one per account): the title and what tells this one apart. The
   *  title names it otherwise. */
  name?: string;
  /** A quiet IconButton before the title, such as the grip a Sortable of panels hands each
   *  panel. On the ink bar it prints as `actions` do. */
  lead?: ReadonlyArray<Html | string>;
  /** A count or state at the title bar's right. */
  meta?: string;
  /** Small Buttons and IconButtons at the title bar's right end, after the meta. On the ink
   *  bar they print in paper, flat, and ring in their own colour inside their edge. */
  actions?: ReadonlyArray<Html | string>;
  /** A strip on the head tint between the title bar and the body, for a field that picks what
   *  the body shows (an area over its tasks). Its labels print in on-head. */
  shelf?: ReadonlyArray<Html | string>;
  body: ReadonlyArray<Html | string>;
  /** A ruled foot under the body: a note line, then actions pushed right. */
  foot?: ReadonlyArray<Html | string>;
  /** The body sits edge to edge (rows, tables, meters) instead of in the padded body. */
  isFlush?: boolean;
}>;

export const titleId = (id: string): string => `${id}-title`;

/** The unit of the system: paper in a 2px ink box on a 5px print shadow, under a title bar. A
 *  region landmark (`<section>`) named by its `h2` title, or by `name`, keyed by its `id`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    title,
    name,
    lead = [],
    meta,
    actions = [],
    shelf = [],
    body,
    foot = [],
    isFlush = false,
  } = config;

  return h.keyed("section")(
    id,
    [
      h.Id(id),
      name === undefined ? h.AriaLabelledBy(titleId(id)) : h.AriaLabel(name),
      h.Class("panel"),
    ],
    [
      h.header(
        [h.Class("panel-tb")],
        [
          ...slotView("span", "panel-lead", lead, h),
          h.h2([h.Id(titleId(id))], [title]),
          ...(meta === undefined ? [] : [h.span([h.Class("meta")], [meta])]),
          ...slotView("span", "panel-acts", actions, h),
        ]
      ),
      ...slotView("div", "panel-shelf", shelf, h),
      ...(isFlush ? body : [h.div([h.Class("panel-body")], body)]),
      ...slotView("div", "panel-foot", foot, h),
    ]
  );
};
