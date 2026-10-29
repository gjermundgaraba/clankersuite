import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a filter strip with `view`. */
export type ViewConfig = Readonly<{
  /** FilterChips, a QueryChip, a glyph Segmented; `h.span([h.Class("spacer")])` pushes what
   *  follows right. */
  body: ReadonlyArray<Html | string>;
  /** Names the group for screen readers. */
  label?: string;
}>;

/** A printed strip of filters above a list, on a 3px shadow: a `role="group"` named by its
 *  label. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, label = "Filters" } = config;

  return h.div([h.Role("group"), h.AriaLabel(label), h.Class("strip")], body);
};
