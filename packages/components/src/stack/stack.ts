import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

/** `M`: the parts of one body (14px). `L`: whole surfaces, panel to panel (24px). */
export const Space = Schema.Literals(["M", "L"]);

export type Space = typeof Space.Type;

const gapClassName = (gap: Space): string =>
  Match.value(gap).pipe(
    Match.withReturnType<string>(),
    Match.when("M", () => "gg-gap-m"),
    Match.when("L", () => "gg-gap-l"),
    Match.exhaustive
  );

/** Configuration for rendering a stack with `view`. */
export type ViewConfig<Message> = Readonly<{
  body: ReadonlyArray<Html | string>;
  /** `M` by default: the gap inside a panel's body. */
  gap?: Space;
  /** Further attributes for the column: an id, a name, a `tabindex`. Never a class. */
  attributes?: Attributes<Message>;
}>;

/** A column of components a gap apart; each takes the column's width. Space only: no paper,
 *  border or shadow. Put buttons and chips in a Group or a Wrap inside it, so they keep their
 *  own width. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { body, gap = "M", attributes = [] } = config;

  return h.div([...attributes, h.Class(`gg-stack ${gapClassName(gap)}`)], body);
};
