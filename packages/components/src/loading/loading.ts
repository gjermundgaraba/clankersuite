import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** Configuration for rendering a loading line with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Whether the content is on its way. Done, the line empties and leaves the flow, so it
   *  takes no room and no gap, but stays in place, so the next wait is heard. */
  isLoading: boolean;
  /** What is on its way, in pixel caps (`"loading the items"`). `"loading"` by default. */
  label?: string;
  /** Attributes for the line, such as the id and `tabindex="-1"` that make it a place to
   *  send focus. */
  attributes?: Attributes<Message>;
}>;

/** What a panel says while its content is on the way, centred where the content will be, with
 *  the working cursor. A polite status that stays in place with its words swapped, as a live
 *  region must be for a screen reader to hear it: render it before the content, from before
 *  the wait starts, and set `isLoading`. It is not the page's live region (the Announcer's,
 *  marked `data-pixel-paper-announcer`), so a test that counts live regions counts that. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { isLoading, label = "loading", attributes = [] } = config;

  return h.div(
    [
      ...attributes,
      h.Role("status"),
      h.Class(isLoading ? "loading" : "loading-idle"),
    ],
    isLoading ? [label, h.span([h.Class("cursor"), h.AriaHidden(true)])] : []
  );
};
