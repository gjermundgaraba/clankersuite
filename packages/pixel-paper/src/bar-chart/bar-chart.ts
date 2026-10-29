import { Array, Match, Option, Schema, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as ChartTable from "../chart-table/chart-table.ts";
import * as Chip from "../chip/chip.ts";
import * as EmptyState from "../empty-state/empty-state.ts";
import * as Mark from "../mark/mark.ts";

/** `Warn`: the reading prints on amber. `Error`: in a red chip. The cells stay ink either way:
 *  the reading carries the colour, as a meter's does. */
export const Tone = Schema.Literals(["Warn", "Error"]);

export type Tone = typeof Tone.Type;

/** One bar. */
export type BarPoint = Readonly<{
  /** What the bar counts: a day, a client. Short under a column; a row clips a long one, and
   *  the table screen readers read has it whole. */
  label: string;
  /** Zero or more; `None` where there is no reading: no cells light, and it says so. */
  maybeValue: Option.Option<number>;
  tone?: Tone;
}>;

/** Configuration for rendering a bar chart with `view`. */
export type ViewConfig = Readonly<{
  /** Names the chart: the caption of the table screen readers read in its place. */
  label: string;
  points: readonly BarPoint[];
  /** A bar per line, the label at the left and the reading at the right: for many categories
   *  and long names. Without it, an upright column per point: for a run over time. */
  isRows?: boolean;
  /** The top of the scale, every cell lit; the largest value by default. Give charts that are
   *  compared the same one. A value over it lights every cell. */
  max?: number;
  /** After each reading in the table: `"requests"`. */
  unit?: string;
  /** What the labels name, the table's first head: `"Day"`, `"Client"`. */
  category?: string;
  /** What an empty chart says, in pixel caps. */
  empty?: string;
}>;

const READ_EACH = 12;

const COLUMN_CELLS = 10;
const ROW_CELLS = 20;

const litCount = (
  maybeValue: Option.Option<number>,
  top: number,
  cells: number
): number =>
  pipe(
    ChartTable.chartValue(maybeValue),
    Option.filter((value) => value > 0 && top > 0),
    Option.match({
      onNone: () => 0,
      onSome: (value) =>
        Math.min(cells, Math.max(1, Math.round((value / top) * cells))),
    })
  );

const said = (maybeValue: Option.Option<number>): string =>
  Option.match(ChartTable.chartValue(maybeValue), {
    onNone: () => "no reading",
    onSome: ChartTable.chartNumber,
  });

const toneSaid = (tone: Tone): string =>
  tone === "Warn" ? "warning" : "error";

const readingView = <Message>(
  point: BarPoint,
  h: HtmlBuilder<Message>
): Html => {
  const text = said(point.maybeValue);

  return Match.value(point.tone).pipe(
    Match.withReturnType<Html>(),
    Match.when("Error", () => Chip.view({ label: text, tone: "Blocked" }, h)),
    Match.when("Warn", () => Mark.readingView({ label: text }, h)),
    Match.orElse(() =>
      h.span(
        [
          h.Class(
            Option.isNone(ChartTable.chartValue(point.maybeValue))
              ? "bar-num none"
              : "bar-num"
          ),
        ],
        [text]
      )
    )
  );
};

const cellsView = <Message>(
  count: number,
  isOn: (index: number) => boolean,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Array.makeBy(count, (index) =>
    h.span([h.Class(isOn(index) ? "cell on" : "cell")])
  );

const lineView = <Message>(
  point: BarPoint,
  row: number,
  top: number,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const gridRow = h.Style({ gridRow: `${row}` });
  const lit = litCount(point.maybeValue, top, ROW_CELLS);

  return [
    h.span([h.Class("bar-label"), gridRow], [point.label]),
    h.span(
      [h.Class("bar-cells"), gridRow],
      cellsView(ROW_CELLS, (index) => index < lit, h)
    ),
    h.span([h.Class("bar-value"), gridRow], [readingView(point, h)]),
  ];
};

const columnView = <Message>(
  points: readonly BarPoint[],
  top: number,
  h: HtmlBuilder<Message>
) => {
  const isEachRead = points.length <= READ_EACH;
  const step = isEachRead ? 1 : ChartTable.labelStep(points.length);

  return (point: BarPoint, index: number): readonly Html[] => {
    const column = index + 2;
    const gridColumn = h.Style({ gridColumn: `${column}` });
    const lit = litCount(point.maybeValue, top, COLUMN_CELLS);
    const isRead = isEachRead || point.tone !== undefined;

    return [
      h.span(
        [h.Class("bar-value"), gridColumn],
        isRead ? [readingView(point, h)] : []
      ),
      h.span(
        [h.Class("bar-cells"), gridColumn],
        cellsView(COLUMN_CELLS, (cell) => cell >= COLUMN_CELLS - lit, h)
      ),
      ...(index % step === 0
        ? [
            h.span(
              [
                h.Class("bar-label"),
                h.Style({
                  gridColumn: `${column} / span ${Math.min(step, points.length - index)}`,
                }),
              ],
              [point.label]
            ),
          ]
        : []),
    ];
  };
};

const tableView = <Message>(
  config: ViewConfig,
  category: string,
  h: HtmlBuilder<Message>
): Html =>
  ChartTable.view(
    {
      label: config.label,
      heads: [
        category,
        config.unit === undefined ? "Value" : `Value (${config.unit})`,
      ],
      rows: Array.map(config.points, (point) => ({
        label: point.label,
        readings: [
          point.tone === undefined
            ? said(point.maybeValue)
            : `${said(point.maybeValue)}, ${toneSaid(point.tone)}`,
        ],
      })),
    },
    h
  );

/**
 * Amounts side by side as cells: lit in ink up to each value, unlit in head tint, inside one
 * 2px ink frame, the meter's grammar. Columns (the default) for a run over time; `isRows` for
 * categories with long names. The picture is hidden from screen readers, who read a table of
 * the same numbers. Renders on the server: no measuring.
 */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const {
    points,
    isRows = false,
    max,
    category = "Category",
    empty = "nothing to chart",
  } = config;

  const top = ChartTable.chartTop(
    Array.map(points, ({ maybeValue }) => maybeValue),
    Option.fromNullishOr(max)
  );

  const rootAttributes = [h.Class("chart")];

  return Array.match(points, {
    onEmpty: () => EmptyState.view({ title: empty, headingLevel: "Strong" }, h),
    onNonEmpty: (present) =>
      isRows
        ? h.div(rootAttributes, [
            tableView(config, category, h),
            h.div(
              [
                h.Class("bar-rows"),
                h.AriaHidden(true),
                h.Style({
                  "--n": `${present.length}`,
                  "--cells": `${ROW_CELLS}`,
                }),
              ],
              Array.flatMap(present, (point, index) =>
                lineView(point, index + 1, top, h)
              )
            ),
          ])
        : h.div(rootAttributes, [
            tableView(config, category, h),
            h.div(
              [
                h.Class(
                  present.length <= READ_EACH ? "bar-cols each" : "bar-cols"
                ),
                h.AriaHidden(true),
                h.Style({
                  "--n": `${present.length}`,
                  "--cells": `${COLUMN_CELLS}`,
                }),
              ],
              [
                h.span(
                  [h.Class("bar-scale")],
                  [h.span([], [ChartTable.chartNumber(top)]), h.span([], ["0"])]
                ),
                ...Array.flatMap(present, columnView(present, top, h)),
              ]
            ),
          ]),
  });
};
