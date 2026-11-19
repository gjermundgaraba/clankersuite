import { Array, Predicate } from "effect";
import type { KeySequence } from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";

import { keyLabel } from "../key-hint/key-label.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";
import { slotView } from "../slot/slot.ts";
import { measureAttributes } from "../top-bar/bar-height.ts";
import type { Message as BarHeightMessage } from "../top-bar/bar-height.ts";

/** A key worth knowing and what it does, as the key help prints it. */
export type KeyNote = Readonly<{
  keys: KeySequence;
  /** Further keys that do the same, each in its own box after the first: `J` and `K` move. */
  otherKeys?: readonly KeySequence[];
  does: string;
}>;

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
   *  Stage and the toasts stop at its top edge) into the parent's Message, which the
   *  parent's update takes and changes nothing for. In a Scene, resolve the Mount by name with
   *  the lifted Message:
   *  `Scene.Mount.resolve({ name: StatusBar.MeasureHeight.name }, toParentMessage(StatusBar.Message.CompletedMeasureHeight()))`. */
  toParentMessage: (message: BarHeightMessage) => Message;
}>;

const bindingKey = (keys: KeySequence): string =>
  Predicate.isString(keys) ? keys : Array.join(keys, " ");

const keyNoteView =
  <Message>(platform: KeyPlatform, h: HtmlBuilder<Message>) =>
  ({ keys, otherKeys = [], does }: KeyNote): Html =>
    h.keyed("span")(
      bindingKey(keys),
      [],
      [
        ...Array.map([keys, ...otherKeys], (each) =>
          h.kbd([h.Class("gg-key-hint")], [keyLabel(each, platform)])
        ),
        ` ${does}`,
      ]
    );

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
      ...slotView(
        "p",
        "gg-statusbar-keys",
        Array.map(keys, keyNoteView(platform, h)),
        h
      ),
    ]
  );
};
