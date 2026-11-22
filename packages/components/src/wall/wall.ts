import { Glyph } from "@gjermundgaraba/icons";
import type { Html, HtmlBuilder } from "foldkit/html";

export type ViewConfig = Readonly<{
  /** One Card, alone on the ground: sign-in, first-run setup. */
  body: ReadonlyArray<Html | string>;
}>;

/** The whole viewport as bare ground with one card centred on it: the main landmark
 *  (`<main id="main">`). */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body } = config;

  return h.main([h.Id("main"), h.Class("gg-wall")], body);
};

export type MarkConfig = Readonly<{
  /** The wordmark, which the mark prints at wall size. */
  brand: ReadonlyArray<Html | string>;
}>;

/** The wordmark at wall size beside the lock: the top of a wall's card. */
export const markView = <Message>(
  config: MarkConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { brand } = config;

  return h.div(
    [h.Class("gg-wall-mark")],
    [h.span([h.Class("gg-glyph")], [Glyph.view({ name: "lock" }, h)]), ...brand]
  );
};
