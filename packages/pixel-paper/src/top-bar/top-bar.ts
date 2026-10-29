import type { Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";
import { measureAttributes } from "./bar-height.ts";
import type { Message as BarHeightMessage } from "./bar-height.ts";

/** Configuration for rendering a top bar with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The wordmark, at the left. */
  brand: ReadonlyArray<Html | string>;
  /** A NavStrip; on a phone it drops to a full-width strip under the brand. */
  nav?: readonly Html[];
  /** The right-hand tools; they wrap as one group. */
  tools?: ReadonlyArray<Html | string>;
  /** Lifts the bar's lifecycle Message (`MeasureHeight` started: the page's first top bar
   *  keeps `--topbar-h` at its height however it wraps, so anchors land clear of it) into the
   *  parent's Message, which the parent's update takes and changes nothing for. In a Scene,
   *  resolve it with `TopBar.sceneMounts(toParentMessage)`. */
  toParentMessage: (message: BarHeightMessage) => Message;
}>;

/** The sticky paper bar across the top of an interface, closed by a 2px ink rule: the page's
 *  banner landmark (`<header>`), with the brand, the navigation and the tools. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { brand, nav = [], tools = [], toParentMessage } = config;

  return h.header(
    [
      ...measureAttributes(
        toParentMessage,
        { selector: ".topbar", property: "--topbar-h" },
        h
      ),
      h.Class("topbar"),
    ],
    [...brand, ...nav, ...slotView("div", "topbar-tools", tools, h)]
  );
};
