import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** `M`: the parts of one body (14px). `L`: whole surfaces, panel to panel (24px). */
export const Space = Schema.Literals(["M", "L"]);

export type Space = typeof Space.Type;

const gapClassName = (gap: Space): string =>
  Match.value(gap).pipe(
    Match.withReturnType<string>(),
    Match.when("M", () => "gap-m"),
    Match.when("L", () => "gap-l"),
    Match.exhaustive
  );

/** Configuration for rendering a stack with `view`. */
export type ViewConfig = Readonly<{
  body: ReadonlyArray<Html | string>;
  /** `M` by default: the gap inside a panel's body. */
  gap?: Space;
}>;

/** A column of components a gap apart; each takes the column's width. Space only: no paper,
 *  border or shadow. Put buttons and chips in a Group or a Wrap inside it, so they keep their
 *  own width. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, gap = "M" } = config;

  return h.div([h.Class(`stack ${gapClassName(gap)}`)], body);
};
