import { Button as UiButton, Progress as UiProgress } from "@foldkit/ui";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { KeyHintConfig } from "../button/button.ts";
import * as KeyHint from "../key-hint/key-hint.ts";
import { slotView } from "../slot/slot.ts";

/** One decision: where the item goes. */
export type Decision<Message> = Readonly<{
  /** Unique in the card. */
  label: string;
  glyph: GlyphName;
  keyHint?: KeyHintConfig;
  onDecide: Message;
}>;

/** Configuration for rendering a decision card with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The card's name, the item it asks about: its title. */
  label: string;
  /** Where the item came from, a quiet line over its title. */
  source?: Readonly<{ glyph?: GlyphName; text: string }>;
  /** The item's title, usually a TitleField, so it is edited where it is printed. */
  title: Html;
  /** Chips under the title: its area, its goal, who it is owed to. */
  chips?: ReadonlyArray<Html | string>;
  /** The tiles, four to a row. */
  decisions: ReadonlyArray<Decision<Message>>;
  /** Under the tiles at the left: a ghost Delete. */
  lead?: ReadonlyArray<Html | string>;
  /** Under the tiles, pushed right: a ghost Skip. */
  actions?: ReadonlyArray<Html | string>;
}>;

const decisionView = <Message>(
  decision: Decision<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: decision.onDecide,
      toView: (groups) =>
        h.keyed("button")(
          decision.label,
          [...groups.button, h.Class("gg-decision")],
          [
            h.span(
              [h.Class("gg-decision-top")],
              [
                Glyph.view({ name: decision.glyph }, h),
                ...(decision.keyHint === undefined
                  ? []
                  : [KeyHint.view(decision.keyHint, h)]),
              ]
            ),
            h.span([h.Class("gg-decision-label")], [decision.label]),
          ]
        ),
    },
    h
  );

/**
 * One item to decide on, as an inbox asks: where it came from, its title, its chips, then a
 * row of decision tiles, each a button with its glyph and keycap over its words, and the ways
 * past it under them. An `article` named by `label`, on the surface in a hairline ring. Above
 * it, `progressView` says how far through the items the reader is.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    label,
    source,
    title,
    chips = [],
    decisions,
    lead = [],
    actions = [],
  } = config;

  return h.article(
    [h.AriaLabel(label), h.Class("gg-surface gg-decision-card")],
    [
      ...(source === undefined
        ? []
        : [
            h.p(
              [h.Class("gg-decision-source")],
              [
                ...(source.glyph === undefined
                  ? []
                  : [Glyph.view({ name: source.glyph }, h)]),
                source.text,
              ]
            ),
          ]),
      title,
      ...slotView("div", "gg-decision-chips", chips, h),
      h.div(
        [h.Class("gg-decisions")],
        Array.map(decisions, (decision) => decisionView(decision, h))
      ),
      ...Array.match(
        [...lead, ...slotView("span", "gg-card-acts", actions, h)],
        {
          onEmpty: () => [],
          onNonEmpty: (foot) => [h.div([h.Class("gg-decision-foot")], foot)],
        }
      ),
    ]
  );
};

/** Configuration for rendering how far through the items the reader is with `progressView`. */
export type ProgressConfig = Readonly<{
  id: string;
  /** What the bar measures, its name for screen readers: `"Through the Inbox"`. */
  label: string;
  /** The item on the card, counted from one. */
  position: number;
  total: number;
}>;

/** How far through the items the reader is, above the card: `"1 of 5"`, a thin bar of the
 *  ones decided, and how many are left. A `progressbar` built on `@foldkit/ui`'s Progress,
 *  which says `"1 of 5"`. */
export const progressView = <Message>(
  config: ProgressConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, position, total } = config;
  const where = `${position} of ${total}`;

  return UiProgress.view(
    {
      id,
      value: position - 1,
      max: total,
      ariaLabel: label,
      valueText: where,
      toView: (groups) =>
        h.div(
          [...groups.progress, h.Class("gg-decision-progress")],
          [
            h.span([h.Class("gg-tnum")], [where]),
            h.span(
              [...groups.track, h.Class("gg-bar gg-decision-bar")],
              [h.span([...groups.indicator, h.Class("gg-bar-fill")])]
            ),
            h.span([h.Class("gg-tnum")], [`${total - position + 1} left`]),
          ]
        ),
    },
    h
  );
};
