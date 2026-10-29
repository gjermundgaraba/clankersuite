import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** One column of a table. */
export type Column<Row> = Readonly<{
  /** Unique among the columns. */
  key: string;
  /** The column's head, in pixel caps; on a phone, each cell's label. */
  header: string;
  /** Numbers: right-aligned, in the pixel face, with tabular figures. */
  isNumeric?: boolean;
  /** The cell for a row. A function because it receives the row. */
  cell: (row: Row) => ReadonlyArray<Html | string>;
}>;

/** Configuration for rendering a table with `view`. */
export type ViewConfig<Row> = Readonly<{
  /** Names the table's scrolling region for screen readers. */
  label: string;
  columns: ReadonlyArray<Column<Row>>;
  rows: readonly Row[];
  /** The row's stable id. */
  rowKey: (row: Row) => string;
  /** The row's buttons, in a last column pinned right while the table scrolls under it. Its
   *  head is named "Actions" for screen readers. A function because it receives the row. */
  actions?: (row: Row) => ReadonlyArray<Html | string>;
  /** Rows that are switched off print muted. */
  isOff?: (row: Row) => boolean;
}>;

const numericClass = <Message>(
  isNumeric: boolean | undefined,
  h: HtmlBuilder<Message>
) => (isNumeric === true ? [h.Class("num")] : []);

/** A ruled table: head-tinted pixel-caps heads, 1px rules, and a tint under the row the
 *  pointer is on. Every head is a column header (`scope="col"`); on a phone each row becomes a
 *  block of lines, each labelled with its head. It scrolls sideways inside its wrapper. */
export const view = <Row, Message>(
  config: ViewConfig<Row>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, columns, rows, rowKey, actions, isOff } = config;

  const headView = h.thead(
    [],
    [
      h.tr(
        [],
        [
          ...Array.map(columns, (column) =>
            h.keyed("th")(
              column.key,
              [...numericClass(column.isNumeric, h), h.Scope("col")],
              [column.header]
            )
          ),
          ...(actions === undefined
            ? []
            : [
                h.th(
                  [h.Scope("col")],
                  [h.span([h.Class("sr-only")], ["Actions"])]
                ),
              ]),
        ]
      ),
    ]
  );

  const rowView = (row: Row): Html =>
    h.keyed("tr")(
      rowKey(row),
      isOff !== undefined && isOff(row) ? [h.Class("off")] : [],
      [
        ...Array.map(columns, (column) =>
          h.keyed("td")(
            column.key,
            [
              ...numericClass(column.isNumeric, h),
              h.DataAttribute("label", column.header),
            ],
            column.cell(row)
          )
        ),
        ...(actions === undefined
          ? []
          : [h.td([h.Class("acts")], actions(row))]),
      ]
    );

  return h.div(
    [
      h.Role("region"),
      h.AriaLabel(label),
      h.Tabindex(0),
      h.Class("table-wrap"),
    ],
    [
      h.table(
        [h.Class("table")],
        [headView, h.tbody([], Array.map(rows, rowView))]
      ),
    ]
  );
};
