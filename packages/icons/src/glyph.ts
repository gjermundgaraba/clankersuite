import type { Html, HtmlBuilder } from "foldkit/html";

import { glyphs } from "./glyphs.ts";
import type { GlyphName } from "./glyphs.ts";

export { glyphs } from "./glyphs.ts";

const DRAWN_GRID = 24;
const PRINTED_SIZE = 16;
const LINE_WIDTH_PX = 1.5;

/** Configuration for rendering a glyph with `view`. */
export type ViewConfig = Readonly<{
  name: GlyphName;
}>;

/** One glyph from the inventory: a 16px line drawing in `currentColor`. Decorative: label the
 *  control that holds it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { stroke, fill } = glyphs[config.name];

  return h.svg(
    [
      h.ViewBox(`0 0 ${DRAWN_GRID} ${DRAWN_GRID}`),
      h.Width(`${PRINTED_SIZE}`),
      h.Height(`${PRINTED_SIZE}`),
      h.Fill("none"),
      h.Stroke("currentColor"),
      h.StrokeWidth(`${(LINE_WIDTH_PX * DRAWN_GRID) / PRINTED_SIZE}`),
      h.StrokeLinecap("round"),
      h.StrokeLinejoin("round"),
      h.AriaHidden(true),
      h.Class("gg-icon"),
    ],
    [
      ...(stroke === undefined ? [] : [h.path([h.D(stroke)])]),
      ...(fill === undefined
        ? []
        : [h.path([h.D(fill), h.Fill("currentColor")])]),
    ]
  );
};
