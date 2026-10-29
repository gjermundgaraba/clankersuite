import { Meter as UiMeter } from "@foldkit/ui";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Chip from "../chip/chip.ts";
import { LOCALE } from "../locale/locale.ts";
import * as Mark from "../mark/mark.ts";
import { slotView } from "../slot/slot.ts";

const METER_CELLS = 20;
const HIGH_SHARE = 0.8;
const PERCENT = 100;

/** Configuration for rendering cells with `cellsView`. */
export type CellsConfig = Readonly<{
  /** Unique in the document; names the meter's parts. */
  id: string;
  /** How many cells; 20 for a meter, 4 for a strength reading. */
  count: number;
  /** How many print ink. */
  on: number;
  /** Names the reading for screen readers. */
  label: string;
  /** What a screen reader hears for the value: `"3 of 4"`, `"strong"`. */
  valueText: string;
  /** Wide, short cells: a strength or a step count. */
  isShort?: boolean;
}>;

const cellRowView = <Message>(
  count: number,
  on: number,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Array.makeBy(count, (index) =>
    h.span([h.Class(index < on ? "cell on" : "cell")])
  );

/** A reading printed as ink cells in a 2px box: a `meter` (built on `@foldkit/ui`'s Meter)
 *  from none to `count`, named by `label` and read out as `valueText`. */
export const cellsView = <Message>(
  config: CellsConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, count, on, label, valueText, isShort = false } = config;

  return UiMeter.view(
    {
      id,
      value: on,
      min: 0,
      max: count,
      valueText,
      ariaLabel: label,
      toView: (groups) =>
        h.span(
          [...groups.meter, h.Class(isShort ? "cells short" : "cells")],
          cellRowView(count, on, h)
        ),
    },
    h
  );
};

/** One meter in a `listView`. */
export type MeterConfig = Readonly<{
  /** Unique in the document; names the meter's parts. */
  id: string;
  /** What is measured; it names the meter. */
  label: string;
  /** A line under the label: what the reading belongs to. */
  detail?: ReadonlyArray<Html | string>;
  value: number;
  max: number;
  /** After the numbers: `"requests"`, `"MB"`. */
  unit?: string;
  /** Replaces the printed numbers and what screen readers hear:
   *  `"41,200 of 50,000 requests"`. */
  valueText?: string;
  /** Prints the numbers line (the default). Leave it out where it would repeat the
   *  percentage (`valueText: "62% used"`); screen readers still hear `valueText`. */
  hasNumbers?: boolean;
  /** In a red chip once the value reaches `max`. The percentage by default. */
  full?: string;
  /** The lit cells take the reading's tone as well: amber from 80%, red at `max`. For a page
   *  of readings scanned for their level, such as a wall of limits; the reading beside the
   *  cells still says it in a mark or a chip. */
  isToned?: boolean;
  /** The last reading failed: the cells print muted, the numbers are the last known, and
   *  screen readers hear "(stale)" after the name. Say why, and when it was last read, in
   *  `foot`. */
  isStale?: boolean;
  /** The foot line: when it resets, when it was read. */
  foot?: ReadonlyArray<Html | string>;
}>;

const scaled = (share: number, whole: number, isFull: boolean): number => {
  const rounded = Math.round(share * whole);

  return isFull ? rounded : Math.min(whole - 1, rounded);
};

const numbersText = (
  value: number,
  max: number,
  unit: string | undefined
): string => {
  const numbers = `${value.toLocaleString(LOCALE)} / ${max.toLocaleString(LOCALE)}`;

  return unit === undefined ? numbers : `${numbers} ${unit}`;
};

type Level = "Full" | "High" | "Calm";

const levelOf = (value: number, max: number): Level => {
  if (value >= max) {
    return "Full";
  } else if (value >= max * HIGH_SHARE) {
    return "High";
  }

  return "Calm";
};

const percentView = <Message>(
  config: MeterConfig,
  percent: number,
  level: Level,
  h: HtmlBuilder<Message>
): Html => {
  const percentText = `${percent}%`;

  if (level === "Full") {
    return Chip.view({ label: config.full ?? percentText, tone: "Blocked" }, h);
  } else if (level === "High") {
    return Mark.readingView({ label: percentText }, h);
  }

  return h.span([h.Class("pct")], [percentText]);
};

const TONE_CLASS: Readonly<Record<Level, string>> = {
  Full: " toned full",
  High: " toned high",
  Calm: " toned",
};

const meterView = <Message>(
  config: MeterConfig,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    max,
    detail = [],
    foot = [],
    isStale = false,
    hasNumbers = true,
    isToned = false,
  } = config;

  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const level = levelOf(value, max);
  const isFull = level === "Full";
  const numbers = config.valueText ?? numbersText(value, max, config.unit);
  const rowClass = `meter-row${isStale ? " stale" : ""}${isToned ? TONE_CLASS[level] : ""}`;

  return UiMeter.view(
    {
      id,
      value,
      min: 0,
      max,
      valueText: numbers,
      toView: (groups) =>
        h.keyed("li")(
          id,
          [h.Class(rowClass)],
          [
            h.div(
              [h.Class("meter-head")],
              [
                h.span(
                  [...groups.label, h.Class("meter-name")],
                  [
                    label,
                    ...(isStale
                      ? [h.span([h.Class("sr-only")], [" (stale)"])]
                      : []),
                  ]
                ),
                ...slotView("span", "meter-detail", detail, h),
              ]
            ),
            h.div(
              [h.Class("meter-line")],
              [
                h.span(
                  [...groups.meter, h.Class("cells")],
                  cellRowView(
                    METER_CELLS,
                    scaled(share, METER_CELLS, isFull),
                    h
                  )
                ),
                percentView(config, scaled(share, PERCENT, isFull), level, h),
                ...(hasNumbers
                  ? [h.span([h.Class("meter-num tnum")], [numbers])]
                  : []),
              ]
            ),
            ...slotView("div", "meter-foot", foot, h),
          ]
        ),
    },
    h
  );
};

/** Configuration for rendering a list of meters with `listView`. */
export type ListViewConfig = Readonly<{
  meters: readonly MeterConfig[];
}>;

/**
 * A ruled list of meters, edge to edge in a flush panel. Each is a named reading against a
 * maximum, in the vocabulary of `<meter>`, built on `@foldkit/ui`'s Meter: 20 cells, the
 * percentage (amber from 80%, a red chip at `max`, and neither 100% nor every cell before it),
 * the numbers in English, a foot line. The cells print ink unless the meter `isToned`. The cells are the `meter`, named by the printed label,
 * with the value, the maximum and the numbers in words for screen readers.
 */
export const listView = <Message>(
  config: ListViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.ul(
    [h.Role("list"), h.Class("meters")],
    Array.map(config.meters, (meter) => meterView(meter, h))
  );
