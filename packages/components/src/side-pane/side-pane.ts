import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a side pane with `view`. */
export type ViewConfig = Readonly<{
  /** Names the pane for screen readers ("Task details"). */
  label: string;
  /** The pane's contents, flat: a title, properties, notes. */
  body: ReadonlyArray<Html | string>;
}>;

/** A column at the page's right, from under the top bar (or the window's top) to its bottom as
 *  a Rail is at its left, on the surface with a hairline at its left edge: a labelled `aside`,
 *  the details of what the page has chosen, laid out flat. The application renders it in a
 *  Rail's `toPaneView` while it has something to show, and the page keeps its width clear
 *  while it is there. Where the room right of the rail holds less than the pane and the
 *  narrowest deck, it covers the page beside the rail, and the page under it is hidden but for
 *  a dialog opened in it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, body } = config;

  return h.aside([h.AriaLabel(label), h.Class("gg-side-pane")], body);
};
