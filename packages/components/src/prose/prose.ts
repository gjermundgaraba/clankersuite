import type { Html, HtmlBuilder } from "foldkit/html";

export type ViewConfig = Readonly<{
  /** Authored elements: `p`, headings, lists, `blockquote`, `code`, tables, a Notice, or the
   *  view a Markdown renderer makes of a document. Headings are styled at every level: `h1`
   *  as `h2` (a section under the page's own title), `h3` at the body's size, `h4` at the control
   *  size, `h5` in bold at the body's size and `h6` as a muted label, so no two neighbouring
   *  levels look alike. Inside a titled container (a Sheet's `h1`, a Dialog's `h2`), shift a
   *  document's headings so its top level sits under the container's title. */
  body: ReadonlyArray<Html | string>;
}>;

/** Authored text at 15/1.65 sans within a 68ch measure; code and tables may run wider. It
 *  styles the plain elements it holds, so rendered Markdown needs no classes. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => h.div([h.Class("gg-prose")], config.body);
