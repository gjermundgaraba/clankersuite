import type { Html, HtmlBuilder } from "foldkit/html";

/** The colours an application gives its areas and goals, each a token of its own. */
export type Colour = "Amber" | "Sky" | "Coral" | "Sand";

/** What the marker stands for: an area prints a square, a goal a dot. */
export type Kind = "Area" | "Goal";

/** Configuration for rendering a marker with `view`. */
export type ViewConfig = Readonly<{
  colour: Colour;
  kind?: Kind;
}>;

/** A small shape in an area's or a goal's colour, before its name. It only repeats the name
 *  beside it, so it is hidden from screen readers. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { colour, kind = "Area" } = config;

  return h.span([
    h.AriaHidden(true),
    h.Class(
      `gg-marker gg-${colour.toLowerCase()}${kind === "Goal" ? " gg-round" : ""}`
    ),
  ]);
};
