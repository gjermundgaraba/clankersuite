import type { Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a stage with `view`. */
export type ViewConfig = Readonly<{
  /** The canvas, filling the stage. */
  body: ReadonlyArray<Html | string>;
  /** Tools pinned at the left edge (along the bottom on a phone). */
  tools?: readonly Html[];
  /** Along the top edge: the connection, a notice, a count. */
  bar?: ReadonlyArray<Html | string>;
  /** Editing is paused: a Notice that says why (the link dropped, the page is read-only). The
   *  veil comes down over the work, which is inert until this is cleared. */
  paused?: ReadonlyArray<Html | string>;
}>;

/** The ground itself, from under the top bar to the window's edges, for a canvas: the main
 *  landmark (`<main id="main">`). It does not scroll; what is on it pans. While paused, the
 *  work is inert and the reason is on the veil, inside a status (`role="status"`) that stays
 *  in place while the veil comes and goes, so a screen reader hears it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, tools = [], bar = [], paused } = config;

  return h.main(
    [h.Id("main"), h.Class("stage")],
    [
      h.div(
        [
          h.Class("stage-work"),
          ...(paused === undefined ? [] : [h.Inert(true)]),
        ],
        [
          h.div([h.Class("stage-canvas")], body),
          ...slotView("div", "stage-tools", tools, h),
          ...slotView("div", "stage-bar", bar, h),
        ]
      ),
      h.div(
        [h.Role("status")],
        paused === undefined ? [] : [h.div([h.Class("stage-paused")], paused)]
      ),
    ]
  );
};
