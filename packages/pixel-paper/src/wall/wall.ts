import type { Html, HtmlBuilder } from "foldkit/html";

import * as Glyph from "../glyph/glyph.ts";

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
}>;

/** The wordmark at wall size beside the lock in a box: the top of a wall's card. */
export const markView = <Message>(
  config: MarkConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { brand } = config;

  return h.div(
    [h.Class("wall-mark")],
    [h.span([h.Class("glyph")], [Glyph.view({ name: "lock" }, h)]), ...brand]
  );
};
