import { Array, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";

/** One stat in a `listView`. */
export type StatConfig = Readonly<{
  /** What is counted, in the label register (`"Requests today"`); unique in its row. It wraps
   *  when long. */
  label: string;
  /** The figure, printed in English (41,200). `None` when it is not known: a muted dash, and
   *  "not known" for screen readers. */
  maybeValue: Option.Option<number>;
}>;

const valueView = <Message>(
  config: StatConfig,
  h: HtmlBuilder<Message>
): Html =>
  Option.match(config.maybeValue, {
    onNone: () =>
      h.dd(
        [h.Class("stat-value unknown")],
        [
          h.span([h.AriaHidden(true)], ["—"]),
          h.span([h.Class("sr-only")], ["not known"]),
        ]
      ),
    onSome: (value) =>
      h.dd([h.Class("stat-value")], [value.toLocaleString(LOCALE)]),
  });

const statView = <Message>(config: StatConfig, h: HtmlBuilder<Message>): Html =>
  h.keyed("div")(
    config.label,
    [h.Class("stat")],
    [h.dt([h.Class("label")], [config.label]), valueView(config, h)]
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
