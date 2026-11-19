import type { Html, HtmlBuilder } from "foldkit/html";

import { notesView } from "../key-hint/key-hint.ts";
import type { KeyNote } from "../key-hint/key-hint.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";
import { slotView } from "../slot/slot.ts";
import { measureAttributes } from "../top-bar/bar-height.ts";
import type { Message as BarHeightMessage } from "../top-bar/bar-height.ts";

/** Configuration for rendering a status bar with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The state, at the left: a LinkState, a sync word, a count. Beside a Rail, the state
   *  belongs in the rail's foot, and the bar holds only keys. */
  body?: ReadonlyArray<Html | string>;
  /** Keys worth knowing, printed and not pressable: centred, or at the right of a state.
   *  Narrow, they wrap under the state. */
  keys?: readonly KeyNote[];
  platform: KeyPlatform;
  /** Lifts the bar's lifecycle Message (`MeasureHeight` started: the page keeps
   *  `--gg-statusbar-h` at the bar's exact height however it wraps, so the page, a Bench, a
   *  Stage, a SidePane that covers the page and the toasts stop at its top edge) into the
   *  parent's Message, which the parent's update takes and changes nothing for. In a Scene,
   *  resolve the Mount by name with the lifted Message:
   *  `Scene.Mount.resolve({ name: StatusBar.MeasureHeight.name }, toParentMessage(StatusBar.Message.CompletedMeasureHeight()))`. */
  toParentMessage: (message: BarHeightMessage) => Message;
}>;

/** The key bar along the bottom of an interface: the keys to know, each in a ringed box, and
 *  what state it is in where there is no Rail to hold it. It runs between a Rail and a
 *  SidePane. One per page, after the rail, the deck and the side pane and outside `main`,
 *  where it is the page's footer (`<footer>`, the contentinfo landmark). Its keys are content,
 *  so each `kbd` is read. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { body = [], keys = [], platform, toParentMessage } = config;

  return h.footer(
    [
      ...measureAttributes(
        toParentMessage,
        { selector: ".gg-statusbar", property: "--gg-statusbar-h" },
        h
      ),
      h.Class("gg-statusbar"),
    ],
    [
      ...slotView("div", "gg-statusbar-state", body, h),
      ...slotView("p", "gg-statusbar-keys", notesView(keys, platform, h), h),
    ]
  );
};
