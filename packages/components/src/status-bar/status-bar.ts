import { Array, Predicate } from "effect";
import type { KeySequence } from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";

import { keyLabel } from "../key-hint/key-label.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";
import { slotView } from "../slot/slot.ts";
import { measureAttributes } from "../top-bar/bar-height.ts";
import type { Message as BarHeightMessage } from "../top-bar/bar-height.ts";

/** A key worth knowing and what it does, as the key help prints it. */
export type KeyNote = Readonly<{ keys: KeySequence; does: string }>;

/** Configuration for rendering a status bar with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The state, at the left: a LinkState, a sync word, a count. */
  body: ReadonlyArray<Html | string>;
  /** Keys worth knowing, at the right, printed and not pressable. Narrow, they wrap under the
   *  state. */
  keys?: readonly KeyNote[];
  platform: KeyPlatform;
  /** Lifts the bar's lifecycle Message (`MeasureHeight` started: the page keeps
   *  `--statusbar-h` at the bar's height however it wraps, so the page, the rail, a banner and
   *  the toasts stop above it) into the parent's Message, which the parent's update takes and
   *  changes nothing for. In a Scene, resolve the Mount by name with the lifted Message:
   *  `Scene.Mount.resolve({ name: StatusBar.MeasureHeight.name }, toParentMessage(StatusBar.Message.CompletedMeasureHeight()))`. */
  toParentMessage: (message: BarHeightMessage) => Message;
}>;

const bindingKey = (keys: KeySequence): string =>
  Predicate.isString(keys) ? keys : Array.join(keys, " ");

const keyNoteView =
  <Message>(platform: KeyPlatform, h: HtmlBuilder<Message>) =>
  ({ keys, does }: KeyNote): Html =>
    h.keyed("span")(
      bindingKey(keys),
      [],
      [h.kbd([h.Class("key-hint")], [keyLabel(keys, platform)]), ` ${does}`]
    );

/** The quiet line along the bottom of an interface: what state it is in, and the keys to
 *  know. One per page, after the rail and the deck and outside `main`, where it is the page's
 *  footer (`<footer>`, the contentinfo landmark). Its keys are content, so each `kbd` is read. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { body, keys = [], platform, toParentMessage } = config;

  return h.footer(
    [
      ...measureAttributes(
        toParentMessage,
        { selector: ".statusbar", property: "--statusbar-h" },
        h
      ),
      h.Class("statusbar"),
    ],
    [
      h.div([h.Class("statusbar-state")], body),
      ...slotView(
        "p",
        "statusbar-keys",
        Array.map(keys, keyNoteView(platform, h)),
        h
      ),
    ]
  );
};
