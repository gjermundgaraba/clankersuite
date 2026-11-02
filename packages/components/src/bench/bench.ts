import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a bench with `view`. */
export type ViewConfig = Readonly<{
  /** Above the work, at its own height while the work keeps its floor, past which it scrolls:
   *  a PageHead, notices, and a Rail's open button first. */
  head: ReadonlyArray<Html | string>;
  /** The work, taking the rest of the window's height and never less than
   *  `--bench-work-min`: a Reel, which fills it, and the page's dialogs. */
  body: ReadonlyArray<Html | string>;
}>;

/** A page whose work is the window: its head at its own height, then the work in all the
 *  height left, from under the top bar to the window's bottom and edge to edge (beside a Rail,
 *  from the rail's edge). The main landmark (`<main id="main">`). The page does not scroll:
 *  the work scrolls itself where it must (a reel's columns, sideways), and on a short window
 *  the head scrolls in what the work's floor leaves it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { head, body } = config;

  return h.main(
    [h.Id("main"), h.Class("bench")],
    [h.div([h.Class("bench-head")], head), h.div([h.Class("bench-work")], body)]
  );
};
