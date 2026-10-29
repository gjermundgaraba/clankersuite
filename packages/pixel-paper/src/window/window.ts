import type { Html, HtmlBuilder } from "foldkit/html";

import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { titleId } from "../panel/panel.ts";
import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a window with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the title's id is made from it, and names the window. */
  id: string;
  /** Pixel caps in the inverted title bar. */
  title: string;
  /** A quiet IconButton before the kind glyph: a Reel's grip. */
  lead?: readonly Html[];
  /** What kind of thing it is: a terminal, a note, a machine. */
  glyph?: GlyphName;
  /** A chip in the title bar: its state. */
  status?: ReadonlyArray<Html | string>;
  /** IconButtons in the title bar, before the close. A child Submodel, whose view is one
   *  `Html`, hands back several in a `span.window-tools`: it is no box of its own
   *  (`display: contents`), so its buttons sit in the bar as the others do. */
  tools?: readonly Html[];
  /** The close glyph's Message; the glyph prints when it is given. */
  onClose?: Message;
  body: ReadonlyArray<Html | string>;
  /** The body meets the border: a terminal, an editor, rows. */
  isFlush?: boolean;
}>;

/** A panel that lives on a stage, sized by whatever places it (and moved by it, if it moves):
 *  its body scrolls inside, and its title bar carries its kind, its state and its tools. A
 *  region landmark (`<section>`) named by its `h2` title. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    title,
    lead = [],
    glyph,
    status = [],
    tools = [],
    onClose,
    body,
    isFlush = false,
  } = config;

  return h.section(
    [
      h.Id(id),
      h.AriaLabelledBy(titleId(id)),
      h.Class(isFlush ? "panel window flush" : "panel window"),
    ],
    [
      h.header(
        [h.Class("panel-tb")],
        [
          ...slotView("span", "panel-lead", lead, h),
          ...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]),
          h.h2([h.Id(titleId(id))], [title]),
          ...status,
          ...tools,
          ...(onClose === undefined
            ? []
            : [
                IconButton.view(
                  { glyph: "cross", label: "Close", onClick: onClose },
                  h
                ),
              ]),
        ]
      ),
      h.div([h.Class("window-body")], body),
    ]
  );
};
