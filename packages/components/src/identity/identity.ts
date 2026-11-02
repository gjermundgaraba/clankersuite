import type { Html, HtmlBuilder } from "foldkit/html";

import * as Monogram from "../monogram/monogram.ts";
import { slotView } from "../slot/slot.ts";

/** Configuration for rendering an identity with `view`. */
export type ViewConfig = Readonly<{
  /** Whose: a person, a client, a provider, a source. */
  label: string;
  /** The monogram's mark drawn in cells, in place of its letters (see Monogram). */
  drawing?: string;
  /** A line under the name: an id, a kind, a scope. */
  meta?: ReadonlyArray<Html | string>;
  /** Beside a name set large, as a card's subject. */
  isLarge?: boolean;
}>;

/** Who or what something is: its monogram beside its name in the sans, and a meta line.
 *  Screen readers hear the name once: the monogram beside it is hidden from them. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, drawing, meta = [], isLarge = false } = config;

  return h.div(
    [h.Class(isLarge ? "identity large" : "identity")],
    [
      Monogram.view(
        {
          label,
          ...(drawing !== undefined && { drawing }),
          isLarge,
        },
        h
      ),
      h.span(
        [h.Class("identity-text")],
        [h.strong([], [label]), ...slotView("span", "meta", meta, h)]
      ),
    ]
  );
};
