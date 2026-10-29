import { Disclosure as UiDisclosure } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Glyph from "../glyph/glyph.ts";

/** Configuration for rendering a disclosure with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document; the button's and the body's ids derive from it. */
  id: string;
  /** What opens, in pixel caps (`"edit grants"`, `"danger zone"`): the button's name. */
  label: string;
  /** Whether it is open, from the parent's Model. */
  isOpen: boolean;
  /** Dispatched with the new state when the line is pressed, or Enter or Space is pressed on
   *  it. Store it and pass it back in as `isOpen`. */
  onToggle: (isOpen: boolean) => Message;
  /** What hangs under the line while it is open. It stays on the page while closed (hidden),
   *  so a field in it keeps what was typed. */
  body: ReadonlyArray<Html | string>;
}>;

/**
 * A line that opens what is under it, built on `@foldkit/ui`'s Disclosure: the parent owns
 * whether it is open. `div.disclosure > button.disclosure-summary[aria-expanded]` (the caret
 * and the label) and `div.disclosure-body`, which hangs from the caret on a 1px
 * rule guide. Open, the caret turns a quarter in one step. For what a reader opens on purpose
 * (grants to edit, details, a danger zone), never to hide the one thing the screen is for.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, isOpen, onToggle, body } = config;

  return UiDisclosure.view(
    {
      id,
      isOpen,
      onToggle,
      toView: (groups) =>
        h.div(
          [h.Class("disclosure")],
          [
            h.button(
              [...groups.button, h.Class("disclosure-summary")],
              [
                Glyph.view({ name: "caret-right" }, h),
                h.span([h.Class("disclosure-label")], [label]),
              ]
            ),
            h.div(
              [...groups.panel, h.Hidden(!isOpen), h.Class("disclosure-body")],
              body
            ),
          ]
        ),
    },
    h
  );
};
