import type { Html, HtmlBuilder } from "foldkit/html";

import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";

/** Configuration for rendering a wall with `view`. */
export type ViewConfig = Readonly<{
  /** One Card, alone on the ground: sign-in, first-run setup. */
  body: ReadonlyArray<Html | string>;
}>;

/** The whole viewport as dithered ground with one card centred on it: the main landmark
 *  (`<main id="main">`). */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.main([h.Id("main"), h.Class("wall")], body);
};

/** Configuration for rendering a wall's mark with `markView`. */
export type MarkConfig = Readonly<{
  /** The wordmark, which the mark prints at wall size. */
  brand: ReadonlyArray<Html | string>;
  /** Defaults to the lock. */
  glyph?: GlyphName;
}>;

/** The wordmark at wall size beside a glyph in a box: the top of a wall's card. */
export const markView = <Message>(
  config: MarkConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { brand, glyph = "lock" } = config;

  return h.div(
    [h.Class("wall-mark")],
    [h.span([h.Class("glyph")], [Glyph.view({ name: glyph }, h)]), ...brand]
  );
};

/** Configuration for rendering a wall's corner slip with `cornerView`. */
export type CornerConfig = Readonly<{
  /** What the slip holds, for screen readers: "Display", "Specimen". */
  label: string;
  /** What a top bar would hold on a page without one: a SchemeSwitch, a way back. */
  body: ReadonlyArray<Html | string>;
}>;

/** A paper slip in the top-left corner of a page with no top bar, outside its card: a named
 *  complementary landmark (`<aside>`). Render it just before the Wall: the card keeps clear of
 *  it, and on a phone it sits above the card. */
export const cornerView = <Message>(
  config: CornerConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, body } = config;

  return h.aside([h.AriaLabel(label), h.Class("wall-corner")], body);
};
