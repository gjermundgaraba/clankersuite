import { Array, Predicate } from "effect";
import type { KeySequence } from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";

import { keyLabel } from "./key-label.ts";
import type { KeyPlatform } from "./key-label.ts";

export type ViewConfig = Readonly<{
  /** The binding's keys, as `Dom.streamFromKeyBindings` names them: `"Q"`, `"Mod+K"`,
   *  `["G", "G"]`. */
  keys: KeySequence;
  platform: KeyPlatform;
}>;

/** A key printed small beside the words of a control, for the eye only: the control's
 *  accessible name stays its words. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.kbd(
    [h.Class("gg-key-hint"), h.AriaHidden(true)],
    [keyLabel(config.keys, config.platform)]
  );

/** A key worth knowing and what it does, as the key help prints it. */
export type KeyNote = Readonly<{
  keys: KeySequence;
  /** Further keys that do the same, printed as words after the first's box: `J` boxed, then
   *  `K move`. Arrows share one box: `↑↓` move. */
  otherKeys?: readonly KeySequence[];
  does: string;
}>;

const bindingKey = (keys: KeySequence): string =>
  Predicate.isString(keys) ? keys : Array.join(keys, " ");

const isArrow = (keys: KeySequence): boolean =>
  Predicate.isString(keys) && keys.startsWith("Arrow");

/** Key notes as a key bar or a sheet's foot prints them: the key in its ringed box (arrows
 *  that do the same in one), any other keys that do the same as words after it, then what it
 *  does. They are content, so each `kbd` is read. */
export const notesView = <Message>(
  notes: readonly KeyNote[],
  platform: KeyPlatform,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const label = (each: KeySequence): string => keyLabel(each, platform);

  return Array.map(notes, ({ keys, otherKeys = [], does }) => {
    const allKeys = [keys, ...otherKeys];

    return h.keyed("span")(
      bindingKey(keys),
      [h.Class("gg-key-note")],
      Array.every(allKeys, isArrow)
        ? [
            h.kbd(
              [h.Class("gg-key-hint")],
              [Array.join(Array.map(allKeys, label), "")]
            ),
            ` ${does}`,
          ]
        : [
            h.kbd([h.Class("gg-key-hint")], [label(keys)]),
            ` ${Array.join([...Array.map(otherKeys, label), does], " ")}`,
          ]
    );
  });
};
