import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";

/** `Warn`: amber, a question or a stop. `Error`: red, refused or failed. `Ok`: a committed
 *  change, in ink. `Quiet`: tinted, nothing wrong. */
export const Tone = Schema.Literals(["Warn", "Error", "Ok", "Quiet"]);

export type Tone = typeof Tone.Type;

const toneGlyph = (tone: Tone): GlyphName =>
  Match.value(tone).pipe(
    Match.withReturnType<GlyphName>(),
    Match.whenOr("Warn", "Error", () => "bang"),
    Match.when("Ok", () => "check"),
    Match.when("Quiet", () => "info"),
    Match.exhaustive
  );

export const TONE_CLASS: Readonly<Record<Tone, string>> = {
  Warn: "",
  Error: " error",
  Ok: " ok",
  Quiet: " quiet",
};

export type ToneGlyphConfig = Readonly<{
  tone: Tone;
  glyph?: GlyphName;
}>;

export const toneGlyphView = <Message>(
  config: ToneGlyphConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.span(
    [h.Class(`glyph${TONE_CLASS[config.tone]}`)],
    [Glyph.view({ name: config.glyph ?? toneGlyph(config.tone) }, h)]
  );

/** Configuration for rendering a notice with `view`. */
export type ViewConfig<Message> = Readonly<{
  tone?: Tone;
  /** Pixel caps, on its own line. */
  title?: string;
  body: ReadonlyArray<Html | string>;
  glyph?: GlyphName;
  /** Controls at the right: retry, reconnect. */
  actions?: ReadonlyArray<Html | string>;
  /** Further attributes for the notice, never a class. */
  attributes?: Attributes<Message>;
}>;

/** One line in the product's own words, beside a glyph in a box. An `Error` notice is an
 *  alert (`role="alert"`), so a screen reader says it when it appears; the others are quiet. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    tone = "Warn",
    title,
    body,
    glyph,
    actions = [],
    attributes = [],
  } = config;

  return h.div(
    [
      ...attributes,
      ...(tone === "Error" ? [h.Role("alert")] : []),
      h.Class(`notice${TONE_CLASS[tone]}`),
    ],
    [
      toneGlyphView({ tone, ...(glyph !== undefined && { glyph }) }, h),
      h.div(
        [],
        [...(title === undefined ? [] : [h.strong([], [title])]), ...body]
      ),
      ...actions,
    ]
  );
};
