import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { slotView } from "../slot/slot.ts";

export type ViewConfig<Message = never> = Readonly<{
  /** The screen's name: its `h1`, in sans. A long one wraps; nothing is cut. */
  title: string;
  /** On the `h1`, before its own: an id and `tabindex="-1"` make it where focus lands when
   *  the screen opens. */
  titleAttributes?: ReadonlyArray<Attribute<Message>>;
  /** A 24px glyph before the title: the place's own, as the sidebar prints it. */
  glyph?: GlyphName;
  /** A line under the title: the day and a count ("Wednesday 18 November · 7 to do"), or what
   *  the screen holds. */
  meta?: string;
  /** The screen's own Buttons at the right, level with the title's foot; under it on a
   *  phone. A ghost Button with its key hint is the usual one. */
  actions?: ReadonlyArray<Html | string>;
  /** A line of chips under the head: the goals the screen's tasks serve. */
  strip?: ReadonlyArray<Html | string>;
}>;

/** The heading of a working screen, above its groups: its name as the page's `h1`, its glyph
 *  before it, a line under it, the screen's actions at the right, and a strip of chips below.
 *  One per screen; the groups and panels below it title in `h2`. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    title,
    titleAttributes = [],
    glyph,
    meta,
    actions = [],
    strip = [],
  } = config;

  return h.div(
    [h.Class("gg-page-head")],
    [
      h.div(
        [h.Class("gg-page-name")],
        [
          h.h1(
            [...titleAttributes, h.Class("gg-page-title")],
            [
              ...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]),
              title,
            ]
          ),
          ...(meta === undefined
            ? []
            : [h.p([h.Class("gg-page-meta")], [meta])]),
        ]
      ),
      ...slotView("div", "gg-page-acts", actions, h),
      ...slotView("div", "gg-page-strip", strip, h),
    ]
  );
};
