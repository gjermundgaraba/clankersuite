import type { Html, HtmlBuilder } from "foldkit/html";

import * as IconButton from "../icon-button/icon-button.ts";

/** The pane's top line: where its item lives at the left, and a close glyph at the right. */
export type Top<Message> = Readonly<{
  /** Where the item lives: an area's Marker and name, `›` its parent. */
  context: ReadonlyArray<Html | string>;
  /** The close glyph's name: `"Close the details"`. */
  closeLabel: string;
  onClose: Message;
}>;

/** Configuration for rendering a side pane with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Names the pane for screen readers ("Task details"). */
  label: string;
  top?: Top<Message>;
  /** The pane's contents, flat: a `titleView`, a flat PropsList, a `notesView`, subtasks in a
   *  Rows section. */
  body: ReadonlyArray<Html | string>;
}>;

const topView = <Message>(top: Top<Message>, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("gg-side-pane-top")],
    [
      h.span([h.Class("gg-side-pane-context")], top.context),
      IconButton.view(
        {
          glyph: "cross",
          label: top.closeLabel,
          isQuiet: true,
          onClick: top.onClose,
        },
        h
      ),
    ]
  );

/** Configuration for rendering a side pane's title with `titleView`. */
export type TitleConfig = Readonly<{
  /** A row's check (`Rows.checkView`) beside the title. */
  check?: Html;
  /** The title, usually a TitleField, so it is edited where it is printed. */
  title: Html;
}>;

/** The item's title in the pane, its check beside it, as a task's row prints them. */
export const titleView = <Message>(
  config: TitleConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("gg-side-pane-title")],
    [...(config.check === undefined ? [] : [config.check]), config.title]
  );

/** Configuration for rendering the item's notes with `notesView`. */
export type NotesConfig = Readonly<{
  /** Long-form text or a Markdown editor. */
  body: ReadonlyArray<Html | string>;
  /** Quiet in their place while there are none: `"Notes, in Markdown…"`. */
  placeholder?: string;
}>;

/** The item's notes under a rule, or a quiet placeholder while there are none. */
export const notesView = <Message>(
  config: NotesConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, placeholder } = config;

  return h.div(
    [h.Class("gg-side-pane-notes")],
    body.length === 0 && placeholder !== undefined
      ? [h.p([h.Class("gg-side-pane-placeholder")], [placeholder])]
      : body
  );
};

/** A column at the page's right, from under the top bar (or the window's top) to its bottom as
 *  a Rail is at its left, on the surface with a hairline at its left edge: a labelled `aside`,
 *  the details of what the page has chosen, laid out flat. Its `top` line says where the item
 *  lives and closes the pane. The application renders it in a Rail's `toPaneView` while it has
 *  something to show, and the page keeps its width clear while it is there. Where the room
 *  right of the rail holds less than the pane and the narrowest deck, it covers the page
 *  beside the rail, and the page under it is hidden but for a dialog opened in it. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, top, body } = config;

  return h.aside(
    [h.AriaLabel(label), h.Class("gg-side-pane")],
    [...(top === undefined ? [] : [topView(top, h)]), ...body]
  );
};
