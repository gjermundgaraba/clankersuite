import { Array, Option, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as ChartTable from "../chart-table/chart-table.ts";
import * as EmptyState from "../empty-state/empty-state.ts";

/** One line of a chart. */
export type LineSeries = Readonly<{
  /** Names the series in the key and heads its column in the table. */
  name: string;
  /** One value per label, zero or more; `None` (or a value left off the end) where there is no
   *  reading: the line breaks there. */
  values: ReadonlyArray<Option.Option<number>>;
}>;

/** Configuration for rendering a line chart with `view`. */
export type ViewConfig = Readonly<{
  /** Names the chart: the caption of the table screen readers read in its place. */
  label: string;
  /** One per point, in order: days, versions. Up to eight print under the plot (past that,
   *  every nth); the table has them all. */
  labels: readonly string[];
  /** One series in ink, or two: the second prints in muted ink with smaller cells, never a
   *  hue, and a key names both. */
  series: readonly [LineSeries] | readonly [LineSeries, LineSeries];
  /** After each reading in the table: `"ms"`. */
  unit?: string;
  /** What the labels name, the table's first head: `"Day"`, `"Version"`. */
  category?: string;
}>;

const PLOT_WIDTH = 600;
const PLOT_HEIGHT = 160;
const PERCENT = 100;

type Point = Readonly<{ x: number; y: number }>;

const valueAt = (values: ReadonlyArray<Option.Option<number>>, index: number) =>
  pipe(Array.get(values, index), Option.flatten, ChartTable.chartValue);

const placeX = (index: number, count: number): number =>
  count === 1 ? PLOT_WIDTH / 2 : Math.round((index * PLOT_WIDTH) / (count - 1));

const placeY = (value: number, top: number): number =>
  top > 0
    ? Math.round(
        PLOT_HEIGHT - (Math.min(Math.max(value, 0), top) / top) * PLOT_HEIGHT
      )
    : PLOT_HEIGHT;

const place = (
  values: ReadonlyArray<Option.Option<number>>,
  count: number,
  top: number
): ReadonlyArray<Option.Option<Point>> =>
  Array.makeBy(count, (index) =>
    Option.map(valueAt(values, index), (value) => ({
      x: placeX(index, count),
      y: placeY(value, top),
    }))
  );

const steps = (points: ReadonlyArray<Option.Option<Point>>): string =>
  pipe(
    points,
    Array.map((maybePoint, index) =>
      Option.match(maybePoint, {
        onNone: () => "",
        onSome: (point) =>
          Option.match(Option.flatten(Array.get(points, index - 1)), {
            onNone: () => `M${point.x} ${point.y}`,
            onSome: (before) =>
              `H${Math.round((before.x + point.x) / 2)}V${point.y}H${point.x}`,
          }),
      })
    ),
    Array.join("")
  );

const cells = (points: ReadonlyArray<Option.Option<Point>>): string =>
  pipe(
    points,
    Array.map((maybePoint) =>
      Option.match(maybePoint, {
        onNone: () => "",
        onSome: ({ x, y }) => `M${x} ${y}h0`,
      })
    ),
    Array.join("")
  );

const keyView = <Message>(
  series: ViewConfig["series"],
  h: HtmlBuilder<Message>
) =>
  series.length === 2
    ? [
        h.ul(
          [h.Class("chart-key")],
          Array.map(series, ({ name }, index) =>
            h.li(index > 0 ? [h.Class("second")] : [], [
              h.span([h.Class("key-cell")]),
              name,
            ])
          )
        ),
      ]
    : [];

const edgeClass = (count: number, index: number): string => {
  if (count > 1 && index === 0) {
    return "first";
  }

  if (count > 1 && index === count - 1) {
    return "last";
  }

  return "";
};

const labelView =
  <Message>(count: number, h: HtmlBuilder<Message>) =>
  (label: string, index: number): Html =>
    h.span(
      [
        h.Class(edgeClass(count, index)),
        h.Style({
          left: `${count === 1 ? PERCENT / 2 : (index * PERCENT) / (count - 1)}%`,
        }),
      ],
      [label]
    );

const readingText = (
  values: ReadonlyArray<Option.Option<number>>,
  index: number,
  unit: string | undefined
): string =>
  Option.match(valueAt(values, index), {
    onNone: () => "no reading",
    onSome: (value) =>
      unit === undefined
        ? ChartTable.chartNumber(value)
        : `${ChartTable.chartNumber(value)} ${unit}`,
  });

const seriesView = <Message>(
  line: LineSeries,
  isSecond: boolean,
  count: number,
  top: number,
  h: HtmlBuilder<Message>
): Html => {
  const points = place(line.values, count, top);
  const path = steps(points);

  return h.g(isSecond ? [h.Class("second")] : [], [
    ...(path.includes("H") ? [h.path([h.Class("line-path"), h.D(path)])] : []),
    h.path([h.Class("line-cells"), h.D(cells(points))]),
  ]);
};

const chartView = <Message>(
  config: ViewConfig,
  labels: Array.NonEmptyReadonlyArray<string>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, series, unit, category = "Category" } = config;
  const count = labels.length;

  const top = ChartTable.chartTop(
    Array.flatMap(series, ({ values }) => Array.take(values, count)),
    Option.none()
  );

  const step = ChartTable.labelStep(count);

  return h.div(
    [h.Class("chart")],
    [
      ChartTable.view(
        {
          label,
          heads: [category, ...Array.map(series, ({ name }) => name)],
          rows: Array.map(labels, (pointLabel, index) => ({
            label: pointLabel,
            readings: Array.map(series, ({ values }) =>
              readingText(values, index, unit)
            ),
          })),
        },
        h
      ),
      h.div(
        [h.Class("line-chart"), h.AriaHidden(true)],
        [
          ...keyView(series, h),
          h.span(
            [h.Class("line-scale")],
            [h.span([], [ChartTable.chartNumber(top)]), h.span([], ["0"])]
          ),
          h.div(
            [h.Class("line-plot")],
            [
              h.svg(
                [
                  h.ViewBox(`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`),
                  h.PreserveAspectRatio("none"),
                ],
                [
                  ...Array.map(Array.tailNonEmpty(series), (line) =>
                    seriesView(line, true, count, top, h)
                  ),
                  seriesView(Array.headNonEmpty(series), false, count, top, h),
                ]
              ),
            ]
          ),
          h.span(
            [h.Class("line-labels")],
            pipe(
              labels,
              Array.map(labelView(count, h)),
              Array.filter((_, index) => index % step === 0)
            )
          ),
        ]
      ),
    ]
  );
};

/**
 * A reading over time as a stepped line in whole pixels: ink on paper, every point a cell, 1px
 * rule axes, the scale and the labels in the label register. A second series prints in muted
 * ink. The picture is hidden from screen readers, who read a table of the same numbers.
 * Renders on the server: a fixed viewBox, stretched to its container's width.
 */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  Array.match(config.labels, {
    onEmpty: () =>
      EmptyState.view({ title: "nothing to chart", headingLevel: "Strong" }, h),
    onNonEmpty: (labels) => chartView(config, labels, h),
  });
