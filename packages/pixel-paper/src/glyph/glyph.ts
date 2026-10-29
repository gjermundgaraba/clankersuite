import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { glyphs } from "./glyphs.ts";
import type { Cell, GlyphName } from "./glyphs.ts";

const DRAWN_SIZE = 12;

/** Configuration for rendering a glyph with `view`. */
export type ViewConfig = Readonly<{
  name: GlyphName;
  /** Rendered size in px. The grid is always 12x12; 12 is the size it was drawn for. */
  size?: number;
}>;

export const cellView =
  <Message>(h: HtmlBuilder<Message>) =>
  ([x, y, width, height]: Cell): Html =>
    h.rect([
      h.X(`${x}`),
      h.Y(`${y}`),
      h.Width(`${width}`),
      h.Height(`${height}`),
      h.Fill("currentColor"),
    ]);

/** One glyph from the inventory, in `currentColor`. Decorative: label the control that holds
 *  it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { name, size = DRAWN_SIZE } = config;

  return h.svg(
    [
      h.ViewBox(`0 0 ${DRAWN_SIZE} ${DRAWN_SIZE}`),
      h.Width(`${size}`),
      h.Height(`${size}`),
      h.AriaHidden(true),
      h.Class("px-icon"),
    ],
    Array.map(glyphs[name], cellView(h))
  );
};
