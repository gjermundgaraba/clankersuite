import { Array, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";

const MAX_LABELS = 8;

export const chartNumber = (value: number): string =>
  value.toLocaleString(LOCALE);

export const chartValue = (
  maybeValue: Option.Option<number>
): Option.Option<number> =>
  Option.filter(maybeValue, globalThis.Number.isFinite);

export const chartTop = (
  values: ReadonlyArray<Option.Option<number>>,
  maybeMax: Option.Option<number>
): number =>
  Math.max(
    0,
    Option.getOrElse(maybeMax, () =>
      Math.max(
        0,
        ...Array.map(values, (maybeValue) =>
          Option.getOrElse(chartValue(maybeValue), () => 0)
        )
      )
    )
  );

export const labelStep = (count: number): number =>
  Math.max(1, Math.ceil(count / MAX_LABELS));

type ChartTableRow = Readonly<{
  label: string;
  readings: readonly string[];
}>;

type ViewConfig = Readonly<{
  label: string;
  heads: readonly string[];
  rows: readonly ChartTableRow[];
}>;

/** A chart's data as a real table that only screen readers meet: the picture beside it is
 *  hidden from them, and this says everything the picture does, in order, each point's label
 *  a row header. A table grows to its cells whatever its width says, so the box that hides it
 *  is a div around it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("sr-only")],
    [
      h.table(
        [],
        [
          h.caption([], [config.label]),
          h.thead(
            [],
            [
              h.tr(
                [],
                Array.map(config.heads, (head) =>
                  h.th([h.Scope("col")], [head])
                )
              ),
            ]
          ),
          h.tbody(
            [],
            Array.map(config.rows, ({ label, readings }) =>
              h.tr(
                [],
                [
                  h.th([h.Scope("row")], [label]),
                  ...Array.map(readings, (reading) => h.td([], [reading])),
                ]
              )
            )
          ),
        ]
      ),
    ]
  );
