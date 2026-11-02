import type { KeySequence } from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";

import { keyLabel } from "./key-label.ts";
import type { KeyPlatform } from "./key-label.ts";

/** Configuration for rendering a key hint with `view`. */
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
    [h.Class("key-hint"), h.AriaHidden(true)],
    [keyLabel(config.keys, config.platform)]
  );
