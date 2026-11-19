import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type * as Marker from "../marker/marker.ts";
import { slotView } from "../slot/slot.ts";

/** One column under a goal: what it holds and the column's heading. */
export type Column = Readonly<{
  label: string;
  body: ReadonlyArray<Html | string>;
}>;

/** One of a goal's outcomes, as its step. */
export type Step = Readonly<{ label: string; isDone: boolean }>;

/** Configuration for rendering a goal card with `view`. */
export type ViewConfig = Readonly<{
  /** Unique in the document: the title's id is made from it. */
  id: string;
  title: string;
  colour: Marker.Colour;
  /** One sentence: why the goal exists. */
  description?: string;
  /** At the head's right: the goal's area as a Chip. */
  chip?: Html;
  /** The goal's outcomes in order, each a step that fills in its colour once done, and the
   *  ring at its title fills by the share done. Say them in `meta` too: the ring and the
   *  steps are for the eye. */
  steps: readonly Step[];
  /** A quiet line under the steps: "1 of 2 outcomes · 5 open tasks". */
  meta: string;
  /** Two columns side by side, under their headings: its outcomes, the tasks moving it. */
  columns: readonly Column[];
}>;

const stepsView = <Message>(
  steps: readonly Step[],
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.AriaHidden(true), h.Class("gg-goal-steps")],
    Array.map(steps, (step) =>
      h.keyed("span")(step.label, [h.Class(step.isDone ? "gg-on" : "gg-off")])
    )
  );

const ringView = <Message>(
  steps: readonly Step[],
  h: HtmlBuilder<Message>
): Html => {
  const share =
    steps.length === 0
      ? 0
      : Array.filter(steps, (step) => step.isDone).length / steps.length;

  return h.svg(
    [
      h.ViewBox("0 0 16 16"),
      h.Fill("none"),
      h.StrokeWidth("2.5"),
      h.StrokeLinecap("round"),
      h.AriaHidden(true),
      h.Class("gg-goal-ring"),
    ],
    [
      h.circle([h.Cx("8"), h.Cy("8"), h.R("6"), h.Class("gg-off")]),
      h.circle([
        h.Cx("8"),
        h.Cy("8"),
        h.R("6"),
        h.PathLength("1"),
        h.StrokeDasharray(`${share} 1`),
        h.Transform("rotate(-90 8 8)"),
        h.Class("gg-on"),
      ]),
    ]
  );
};

/** A goal on a card: a ring in its colour that fills as its outcomes are done and its title,
 *  with its area at the right, why it exists, its outcomes as steps and a line that says them,
 *  then its columns. An `article` named by its `h2`, on the surface in a hairline ring, in the
 *  page's flow. In an outcomes column a Choice prints at the ring's size, struck through once
 *  done; its tasks are compact Rows, printed small. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, title, colour, description, chip, steps, meta, columns } = config;
  const titleId = `${id}-title`;

  return h.article(
    [
      h.Id(id),
      h.AriaLabelledBy(titleId),
      h.Class(`gg-surface gg-goal-card gg-${colour.toLowerCase()}`),
    ],
    [
      h.div(
        [h.Class("gg-goal-head")],
        [
          ringView(steps, h),
          h.h2([h.Id(titleId)], [title]),
          ...(chip === undefined ? [] : [chip]),
        ]
      ),
      ...(description === undefined
        ? []
        : [h.p([h.Class("gg-goal-description")], [description])]),
      stepsView(steps, h),
      h.p([h.Class("gg-goal-meta")], [meta]),
      ...slotView(
        "div",
        "gg-goal-columns",
        Array.map(columns, (column) =>
          h.keyed("section")(
            column.label,
            [h.AriaLabel(column.label), h.Class("gg-goal-column")],
            [h.h3([], [column.label]), ...column.body]
          )
        ),
        h
      ),
    ]
  );
};

/** Configuration for rendering the values line with `valuesView`. */
export type ValuesConfig = Readonly<{
  /** Its quiet label: "Values". */
  label: string;
  body: ReadonlyArray<Html | string>;
}>;

/** What the goals serve, on the sunken ground over the goal cards: a quiet label over a
 *  sentence. */
export const valuesView = <Message>(
  config: ValuesConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("gg-values")],
    [h.p([h.Class("gg-values-label")], [config.label]), h.p([], config.body)]
  );
