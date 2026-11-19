import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a side pane with `view`. */
export type ViewConfig = Readonly<{
  /** Names the pane for screen readers ("Task details"). */
  label: string;
  /** The pane's contents: panels, as a rail's. */
  body: ReadonlyArray<Html | string>;
}>;

/** A column of panels at the page's right, fixed between the top bar and the status bar as a
 *  Rail is at its left: a labelled `aside`, the details of what the page has chosen. The
 *  application renders it in a Rail's `toPaneView` while it has something to show, and the
 *  page keeps its width clear while it is there. Where the room right of the rail holds less
 *  than the pane and the narrowest deck, it covers the page between the bars beside the rail,
 *  and the page under it is hidden but for a dialog opened in it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, body } = config;

  return h.aside([h.AriaLabel(label), h.Class("gg-side-pane")], body);
};
