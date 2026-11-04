import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** `Meta`: the quiet words beside a title, in the UI face at label size: an address, a
 *  count, "shown once". `Note`: a line of quiet prose under or between parts, in the body
 *  face, kept to a note's measure: "No matching tasks". */
export const Tone = Schema.Literals(["Meta", "Note"]);

export type Tone = typeof Tone.Type;

/** Configuration for rendering a text with `view`. */
export type ViewConfig<Message> = Readonly<{
  tone: Tone;
  body: ReadonlyArray<Html | string>;
  /** A `Meta` prints in a `span` and a `Note` in a `p` unless told otherwise: a meta line of
   *  its own is a `p`, a note inside a line of text a `span`. */
  isInline?: boolean;
  /** Further attributes for the element: an id. Never a class. */
  attributes?: Attributes<Message>;
}>;

const toneClassName = (tone: Tone): string =>
  Match.value(tone).pipe(
    Match.withReturnType<string>(),
    Match.when("Meta", () => "gg-meta"),
    Match.when("Note", () => "gg-note-line"),
    Match.exhaustive
  );

/** Quiet words in one of the system's two secondary voices. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { tone, body, isInline = tone === "Meta", attributes = [] } = config;
  const textAttributes = [...attributes, h.Class(toneClassName(tone))];

  return isInline ? h.span(textAttributes, body) : h.p(textAttributes, body);
};
