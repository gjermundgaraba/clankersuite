import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import * as Notice from "../notice/notice.ts";

/** Configuration for rendering an outcome with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Pixel caps: what happened, or what is asked (`"Session ended"`). */
  title: string;
  /** One sans sentence: why, and what to do next. */
  body: ReadonlyArray<Html | string>;
  tone?: Notice.Tone;
  glyph?: GlyphName;
  /** What follows the sentence: a code, the details, a list of what was asked. */
  detail?: ReadonlyArray<Html | string>;
  /** Attributes for the title and sentence together, such as the `description` group of the
   *  dialog they describe; never a class. */
  bodyAttributes?: Attributes<Message>;
}>;

/** A state said in full: a 34px glyph box, a title, a sentence. The body of a confirm, and of
 *  a wall that stops the reader (session ended, access refused, service away). */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    title,
    body,
    tone = "Warn",
    glyph,
    detail = [],
    bodyAttributes = [],
  } = config;

  return h.div(
    [h.Class("outcome")],
    [
      Notice.toneGlyphView({ tone, ...(glyph !== undefined && { glyph }) }, h),
      h.div(
        [...bodyAttributes, h.Class("outcome-body")],
        [h.strong([], [title]), h.p([], body), ...detail]
      ),
    ]
  );
};
