import { Array, Match, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import { LOCALE } from "../locale/locale.ts";
import { slotView } from "../slot/slot.ts";

/** Only when a change is a warning in itself: `Warn` fills it amber, `Error` prints it red. Up
 *  is not good and down is not bad until the product says so. */
export const Tone = Schema.Literals(["Warn", "Error"]);

export type Tone = typeof Tone.Type;

/** One stat in a `listView`. */
export type StatConfig = Readonly<{
  /** What is counted, in the label register (`"Requests today"`); unique in its row. It wraps
   *  when long. */
  label: string;
  /** The figure, printed in English (41,200). `None` when it is not known: a muted dash, and
   *  "not known" for screen readers. */
  maybeValue: Option.Option<number>;
  /** After the figure, small: `"%"`, `"ms"`, `"MB"`. */
  unit?: string;
  /** The figure is on its way: the working cursor stands in for it, and it is busy. */
  isLoading?: boolean;
  /** The change since the last reading. Its sign picks the glyph (up, down, level); the figure
   *  prints without one, in ink: a direction is not a meaning. */
  delta?: number;
  /** After the change, as written: `"%"`, `" pts"`, `" ms"`. */
  deltaUnit?: string;
  tone?: Tone;
  /** A sans line under it: what the change is against, where the figure comes from. */
  note?: ReadonlyArray<Html | string>;
}>;

const valueView = <Message>(
  config: StatConfig,
  h: HtmlBuilder<Message>
): Html => {
  if (config.isLoading === true) {
    return h.dd(
      [h.Class("stat-value"), h.AriaBusy(true)],
      [
        h.span([h.Class("sr-only")], ["loading"]),
        h.span([h.Class("cursor"), h.AriaHidden(true)]),
      ]
    );
  }

  return Option.match(config.maybeValue, {
    onNone: () =>
      h.dd(
        [h.Class("stat-value unknown")],
        [
          h.span([h.AriaHidden(true)], ["—"]),
          h.span([h.Class("sr-only")], ["not known"]),
        ]
      ),
    onSome: (value) =>
      h.dd(
        [h.Class("stat-value")],
        [
          value.toLocaleString(LOCALE),
          ...(config.unit === undefined
            ? []
            : [h.span([h.Class("stat-unit")], [config.unit])]),
        ]
      ),
  });
};

const DELTA_TONE: Record<Tone, string> = { Warn: "warn", Error: "error" };

type Direction = Readonly<{ glyph: GlyphName; said: string }>;

const direction = (delta: number): Direction =>
  Match.value(Math.sign(delta)).pipe(
    Match.withReturnType<Direction>(),
    Match.when(1, () => ({ glyph: "arrow-up", said: "up" })),
    Match.when(-1, () => ({ glyph: "arrow-down", said: "down" })),
    Match.orElse(() => ({ glyph: "minus", said: "no change," }))
  );

const deltaView = <Message>(
  config: StatConfig,
  delta: number,
  h: HtmlBuilder<Message>
): Html => {
  const { glyph, said } = direction(delta);

  return h.dd(
    [
      h.Class(
        config.tone === undefined
          ? "stat-delta"
          : `stat-delta ${DELTA_TONE[config.tone]}`
      ),
    ],
    [
      Glyph.view({ name: glyph }, h),
      h.span([h.Class("sr-only")], [said]),
      `${Math.abs(delta).toLocaleString(LOCALE)}${config.deltaUnit ?? ""}`,
    ]
  );
};

const statView = <Message>(config: StatConfig, h: HtmlBuilder<Message>): Html =>
  h.keyed("div")(
    config.label,
    [h.Class("stat")],
    [
      h.dt([h.Class("label")], [config.label]),
      valueView(config, h),
      ...(config.delta === undefined || config.isLoading === true
        ? []
        : [deltaView(config, config.delta, h)]),
      ...slotView("dd", "stat-note", config.note ?? [], h),
    ]
  );

/** Configuration for rendering a row of stats with `listView`. */
export type ListViewConfig = Readonly<{
  stats: readonly StatConfig[];
}>;

/** A row of figures in ruled cells, four across (two on a phone), edge to edge in a flush panel that names what they
 *  measure. A description list: each stat is a term and its value. */
export const listView = <Message>(
  config: ListViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.dl(
    [h.Class("stats")],
    Array.map(config.stats, (stat) => statView(stat, h))
  );
