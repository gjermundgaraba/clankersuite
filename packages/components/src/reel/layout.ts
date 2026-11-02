import {
  Array,
  Equal,
  Match,
  Number,
  Option,
  Predicate,
  Record,
  Schema,
  pipe,
} from "effect";
import { defineMessageUnion } from "foldkit/message";
import { defineTaggedUnion } from "foldkit/schema";

import { LOCALE } from "../locale/locale.ts";

/** Schema for one pane as the reel knows it: its id, unique in the reel and the application's
 *  to keep, its name in words (its grip, its splitter and what screen readers hear), and its
 *  share of its column's height, a weight against its neighbours'. */
export const Pane = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  weight: Schema.Finite,
});

export type Pane = typeof Pane.Type;

export const Column = Schema.Struct({
  id: Schema.String,
  width: Schema.Finite,
  panes: Schema.NonEmptyArray(Pane),
});

export type Column = typeof Column.Type;

/** Schema for a reel's layout: its columns, left to right. The application's to keep. */
export const Layout = Schema.Array(Column);

export type Layout = typeof Layout.Type;

export const Subject = defineTaggedUnion({
  Pane: { paneId: Schema.String },
  Column: { columnId: Schema.String },
});

export type Subject = typeof Subject.Type;

export const Target = defineTaggedUnion({
  Into: { columnId: Schema.String, index: Schema.Finite },
  Gap: { maybeBeforeColumnId: Schema.Option(Schema.String) },
});

export type Target = typeof Target.Type;

/** Union of what a reel asks the application to do to its layout, which the application
 *  applies (`apply` does it) or not, by id, so a request still means what it meant after the
 *  layout changed under it. `MovedPane`: a pane into a column, at `toIndex` among that
 *  column's other panes. `PulledOutPane`: a pane into a column of its own, before a column
 *  (none: after the last). `MovedColumn`: a column to before another (none: last).
 *  `ResizedColumn`: a column's width. `ResizedPanes`: a column's panes' weights, by pane id. */
export const OutMessage = defineMessageUnion({
  MovedPane: {
    paneId: Schema.String,
    toColumnId: Schema.String,
    toIndex: Schema.Finite,
  },
  PulledOutPane: {
    paneId: Schema.String,
    maybeBeforeColumnId: Schema.Option(Schema.String),
  },
  MovedColumn: {
    columnId: Schema.String,
    maybeBeforeColumnId: Schema.Option(Schema.String),
  },
  ResizedColumn: { columnId: Schema.String, width: Schema.Finite },
  ResizedPanes: {
    columnId: Schema.String,
    weights: Schema.Record(Schema.String, Schema.Finite),
  },
});

export type OutMessage = typeof OutMessage.Type;

export const Splitter = defineTaggedUnion({
  Width: { columnId: Schema.String },
  Split: { abovePaneId: Schema.String },
});

export type Splitter = typeof Splitter.Type;

export const Resize = Schema.Union([
  OutMessage.ResizedColumn,
  OutMessage.ResizedPanes,
]);

export type Resize = typeof Resize.Type;

export type Place = Readonly<{
  column: Column;
  columnIndex: number;
  row: number;
  pane: Pane;
}>;

const placesOf = (layout: Layout): readonly Place[] =>
  Array.flatMap(layout, (column, columnIndex) =>
    Array.map(column.panes, (pane, row) => ({ column, columnIndex, row, pane }))
  );

export const placeOf = (layout: Layout, paneId: string): Option.Option<Place> =>
  Array.findFirst(placesOf(layout), (place) => place.pane.id === paneId);

export const placeAt = (
  layout: Layout,
  columnIndex: number,
  row: number
): Option.Option<Place> =>
  Option.flatMap(Array.get(layout, columnIndex), (column) =>
    Option.map(Array.get(column.panes, row), (pane) => ({
      column,
      columnIndex,
      row,
      pane,
    }))
  );

export const firstPlace = (layout: Layout): Option.Option<Place> =>
  placeAt(layout, 0, 0);

const columnIndexOf = (
  layout: Layout,
  columnId: string
): Option.Option<number> =>
  Array.findFirstIndex(layout, (column) => column.id === columnId);

const columnOf = (layout: Layout, columnId: string): Option.Option<Column> =>
  Array.findFirst(layout, (column) => column.id === columnId);

const nextColumnId = (
  layout: Layout,
  columnIndex: number
): Option.Option<string> =>
  Option.map(Array.get(layout, columnIndex + 1), (column) => column.id);

const meanWeight = (panes: readonly Pane[]): number =>
  Array.match(panes, {
    onEmpty: () => 1,
    onNonEmpty: (some) =>
      Array.reduce(
        some,
        0,
        (mean, pane, index) => mean + (pane.weight - mean) / (index + 1)
      ),
  });

const othersIn = (column: Column, paneId: string): readonly Pane[] =>
  Array.filter(column.panes, (pane) => pane.id !== paneId);

const insertAt = <A>(
  items: readonly A[],
  index: number,
  item: A
): Array.NonEmptyArray<A> => {
  const [before, after] = Array.splitAt(
    items,
    Number.clamp(index, { minimum: 0, maximum: items.length })
  );

  return Array.appendAll(Array.append(before, item), after);
};

const without = (layout: Layout, paneId: string): Layout =>
  Array.flatMap(layout, (column) => {
    const others = othersIn(column, paneId);

    return Array.isReadonlyArrayNonEmpty(others)
      ? [{ ...column, panes: others }]
      : [];
  });

const gapIndex = (
  layout: Layout,
  maybeBeforeColumnId: Option.Option<string>
): Option.Option<number> =>
  Option.match(maybeBeforeColumnId, {
    onNone: () => Option.some(layout.length),
    onSome: (columnId) => columnIndexOf(layout, columnId),
  });

const freshColumnId = (layout: Layout, paneId: string, suffix = 1): string => {
  const candidate = suffix === 1 ? paneId : `${paneId}/${suffix}`;

  return Array.some(layout, (column) => column.id === candidate)
    ? freshColumnId(layout, paneId, suffix + 1)
    : candidate;
};

const movePane = (
  layout: Layout,
  paneId: string,
  toColumnId: string,
  toIndex: number
): Layout =>
  Option.match(
    Option.all({
      from: placeOf(layout, paneId),
      to: columnOf(layout, toColumnId),
    }),
    {
      onNone: () => layout,
      onSome: ({ from, to }) => {
        const others = othersIn(to, paneId);

        const weight =
          to.id === from.column.id ? from.pane.weight : meanWeight(others);

        const panes = insertAt(others, toIndex, { ...from.pane, weight });

        return Array.flatMap(layout, (column) =>
          column.id === toColumnId
            ? [{ ...column, panes }]
            : without([column], paneId)
        );
      },
    }
  );

const pullOutPane = (
  layout: Layout,
  paneId: string,
  maybeBeforeColumnId: Option.Option<string>
): Layout =>
  Option.match(placeOf(layout, paneId), {
    onNone: () => layout,
    onSome: (from) => {
      const isAlone = from.column.panes.length === 1;

      const isWhereItIs =
        Equal.equals(maybeBeforeColumnId, Option.some(from.column.id)) ||
        Equal.equals(
          maybeBeforeColumnId,
          nextColumnId(layout, from.columnIndex)
        );

      const rest = without(layout, paneId);

      if (isAlone && isWhereItIs) {
        return layout;
      }

      return Option.match(gapIndex(rest, maybeBeforeColumnId), {
        onNone: () => layout,
        onSome: (gap) =>
          insertAt(rest, gap, {
            id: freshColumnId(rest, paneId),
            width: from.column.width,
            panes: [{ ...from.pane, weight: 1 }],
          }),
      });
    },
  });

const moveColumn = (
  layout: Layout,
  columnId: string,
  maybeBeforeColumnId: Option.Option<string>
): Layout => {
  const rest = Array.filter(layout, (column) => column.id !== columnId);

  return Option.match(
    Option.all({
      column: columnOf(layout, columnId),
      gap: gapIndex(rest, maybeBeforeColumnId),
    }),
    {
      onNone: () => layout,
      onSome: ({ column, gap }) => insertAt(rest, gap, column),
    }
  );
};

const modifyColumn = (
  layout: Layout,
  columnId: string,
  f: (column: Column) => Column
): Layout =>
  Array.map(layout, (column) => (column.id === columnId ? f(column) : column));

/**
 * The layout once `request` is applied: what the reel asked, done the way every client does
 * it. A pane that leaves its column takes the mean weight of the column it joins; a column
 * left without panes goes; a pane pulled out keeps its old column's width, in a column named
 * for it. A request naming a pane or column the layout no longer has changes nothing.
 */
export const apply = (layout: Layout, request: OutMessage): Layout =>
  OutMessage.match(request, {
    MovedPane: ({ paneId, toColumnId, toIndex }) =>
      movePane(layout, paneId, toColumnId, toIndex),
    PulledOutPane: ({ paneId, maybeBeforeColumnId }) =>
      pullOutPane(layout, paneId, maybeBeforeColumnId),
    MovedColumn: ({ columnId, maybeBeforeColumnId }) =>
      moveColumn(layout, columnId, maybeBeforeColumnId),
    ResizedColumn: ({ columnId, width }) =>
      modifyColumn(layout, columnId, (column) => ({ ...column, width })),
    ResizedPanes: ({ columnId, weights }) =>
      modifyColumn(layout, columnId, (column) => ({
        ...column,
        panes: Array.map(column.panes, (pane) => ({
          ...pane,
          weight: Option.getOrElse(
            Record.get(weights, pane.id),
            () => pane.weight
          ),
        })),
      })),
  });

export const isChange = (layout: Layout, request: OutMessage): boolean =>
  !Equal.equals(apply(layout, request), layout);

const PRESET_TOLERANCE = 0.01;

const PRESETS: Array.NonEmptyReadonlyArray<
  Readonly<{ width: number; words: string }>
> = [
  { width: 1 / 3, words: "a third of the width" },
  { width: 1 / 2, words: "half the width" },
  { width: 2 / 3, words: "two thirds of the width" },
  { width: 1, words: "the full width" },
];

const presetOf = (width: number) =>
  Array.findFirst(
    PRESETS,
    (preset) => Math.abs(preset.width - width) < PRESET_TOLERANCE
  );

const percent = (width: number): string =>
  Math.round(width * 100).toLocaleString(LOCALE);

export const widthWords = (width: number): string =>
  Option.match(presetOf(width), {
    onNone: () => `${percent(width)}% of the width`,
    onSome: ({ words }) => words,
  });

export const nextPreset = (width: number): number =>
  Option.getOrElse(
    Array.findFirst(
      PRESETS,
      (preset) => preset.width > width + PRESET_TOLERANCE
    ),
    () => Array.headNonEmpty(PRESETS)
  ).width;

const WORDS = {
  columnSubject: "column with {pane}",
  place: "column {column} of {columns}",
  stackedPlace: "{row} of {rows} in column {column} of {columns}",
};

export const WHERE_IT_WAS = "where it was";

export const fill = (
  template: string,
  fields: Readonly<Record<string, string | number>>
): string =>
  Array.reduce(Object.entries(fields), template, (text, [key, value]) =>
    text.replaceAll(
      `{${key}}`,
      Predicate.isNumber(value) ? value.toLocaleString(LOCALE) : value
    )
  );

export const subjectWords = (
  layout: Layout,
  subject: Subject
): Option.Option<string> =>
  Subject.match(subject, {
    Pane: ({ paneId }) =>
      Option.map(placeOf(layout, paneId), ({ pane }) => pane.label),
    Column: ({ columnId }) =>
      Option.map(columnOf(layout, columnId), (column) =>
        fill(WORDS.columnSubject, {
          pane: Array.headNonEmpty(column.panes).label,
        })
      ),
  });

export const placeWords = (layout: Layout, place: Place): string => {
  const rows = place.column.panes.length;

  const fields = {
    column: place.columnIndex + 1,
    columns: layout.length,
    row: place.row + 1,
    rows,
  };

  return rows > 1
    ? fill(WORDS.stackedPlace, fields)
    : fill(WORDS.place, fields);
};

export const whereWords = (
  layout: Layout,
  subject: Subject
): Option.Option<string> =>
  Subject.match(subject, {
    Pane: ({ paneId }) =>
      Option.map(placeOf(layout, paneId), (place) => placeWords(layout, place)),
    Column: ({ columnId }) =>
      Option.map(columnIndexOf(layout, columnId), (column) =>
        fill(WORDS.place, { column: column + 1, columns: layout.length })
      ),
  });

export const originOf = (
  layout: Layout,
  paneId: string
): Option.Option<Target> =>
  Option.map(placeOf(layout, paneId), ({ column, row }) =>
    Target.Into({ columnId: column.id, index: row })
  );

export const requestOf = (
  layout: Layout,
  paneId: string,
  target: Target
): Option.Option<OutMessage> =>
  Option.liftPredicate(
    Target.match(target, {
      Into: ({ columnId, index }) =>
        OutMessage.MovedPane({ paneId, toColumnId: columnId, toIndex: index }),
      Gap: ({ maybeBeforeColumnId }) =>
        OutMessage.PulledOutPane({ paneId, maybeBeforeColumnId }),
    }),
    (request) => isChange(layout, request)
  );

export const landingWords = (
  layout: Layout,
  paneId: string,
  target: Target
): string =>
  Option.match(requestOf(layout, paneId, target), {
    onNone: () => WHERE_IT_WAS,
    onSome: (request) =>
      Option.getOrElse(
        whereWords(apply(layout, request), Subject.Pane({ paneId })),
        () => WHERE_IT_WAS
      ),
  });

export const columnOfTarget = (
  layout: Layout,
  target: Target
): Option.Option<string> =>
  Target.match(target, {
    Into: ({ columnId }) => Option.some(columnId),
    Gap: ({ maybeBeforeColumnId }) =>
      Option.orElse(maybeBeforeColumnId, () =>
        Option.map(Array.last(layout), ({ id }) => id)
      ),
  });

export const Step = Schema.Literals(["Up", "Down", "Left", "Right"]);

export type Step = typeof Step.Type;

const stopOf = (layout: Layout, target: Target): Option.Option<number> =>
  Target.match(target, {
    Into: ({ columnId }) =>
      Option.map(columnIndexOf(layout, columnId), (column) => column * 2 + 1),
    Gap: ({ maybeBeforeColumnId }) =>
      Option.map(gapIndex(layout, maybeBeforeColumnId), (gap) => gap * 2),
  });

export const isTargetPresent = (layout: Layout, target: Target): boolean =>
  Option.isSome(stopOf(layout, target));

const roomIn = (column: Column, paneId: string): number =>
  othersIn(column, paneId).length;

const targetAtStop = (
  layout: Layout,
  paneId: string,
  stop: number,
  row: number
): Target =>
  stop % 2 === 0
    ? Target.Gap({
        maybeBeforeColumnId: Option.map(
          Array.get(layout, stop / 2),
          ({ id }) => id
        ),
      })
    : Option.match(Array.get(layout, (stop - 1) / 2), {
        onNone: () => Target.Gap({ maybeBeforeColumnId: Option.none() }),
        onSome: (column) =>
          Target.Into({
            columnId: column.id,
            index: Math.min(row, roomIn(column, paneId)),
          }),
      });

const stepOnce = (
  layout: Layout,
  paneId: string,
  target: Target,
  step: Step
): Target => {
  const row = Target.match(target, {
    Into: ({ index }) => index,
    Gap: () => 0,
  });

  return Option.match(stopOf(layout, target), {
    onNone: () => target,
    onSome: (stop) =>
      Match.value(step).pipe(
        Match.withReturnType<Target>(),
        Match.when("Left", () =>
          targetAtStop(layout, paneId, Math.max(stop - 1, 0), row)
        ),
        Match.when("Right", () =>
          targetAtStop(
            layout,
            paneId,
            Math.min(stop + 1, layout.length * 2),
            row
          )
        ),
        Match.whenOr("Up", "Down", () =>
          Target.match(target, {
            Gap: () => target,
            Into: ({ columnId }) =>
              Option.match(columnOf(layout, columnId), {
                onNone: () => target,
                onSome: (column) =>
                  Target.Into({
                    columnId,
                    index: Number.clamp(step === "Up" ? row - 1 : row + 1, {
                      minimum: 0,
                      maximum: roomIn(column, paneId),
                    }),
                  }),
              }),
          })
        ),
        Match.exhaustive
      ),
  });
};

const presentOrOrigin = (
  layout: Layout,
  target: Target,
  origin: Option.Option<Target>
): Target =>
  isTargetPresent(layout, target)
    ? target
    : Option.getOrElse(origin, () => target);

const isChangingDropOrOrigin = (
  layout: Layout,
  paneId: string,
  origin: Option.Option<Target>,
  candidate: Target
): boolean =>
  Option.isSome(requestOf(layout, paneId, candidate)) ||
  Option.exists(origin, (place) => Equal.equals(place, candidate));

const stopAndRowCount = (layout: Layout): number =>
  layout.length * 2 + Array.length(placesOf(layout));

export const steppedTarget = (
  layout: Layout,
  paneId: string,
  target: Target,
  step: Step
): Target => {
  const origin = originOf(layout, paneId);
  const start = presentOrOrigin(layout, target, origin);

  const walkPastUnchangingStops = (from: Target, left: number): Target => {
    const next = stepOnce(layout, paneId, from, step);

    if (Equal.equals(next, from) || left === 0) {
      return start;
    }

    return isChangingDropOrOrigin(layout, paneId, origin, next)
      ? next
      : walkPastUnchangingStops(next, left - 1);
  };

  return walkPastUnchangingStops(start, stopAndRowCount(layout));
};

const GAP_BAND_SHARE = 0.2;
const GAP_BAND_MAX = 48;

export type ColumnBox = Readonly<{
  id: string;
  left: number;
  right: number;
}>;

const gapBefore = (columns: readonly ColumnBox[], gap: number): Target =>
  Target.Gap({
    maybeBeforeColumnId: Option.map(Array.get(columns, gap), ({ id }) => id),
  });

const gapBandOf = ({ left, right }: ColumnBox): number =>
  Math.min((right - left) * GAP_BAND_SHARE, GAP_BAND_MAX);

const columnUnderOrRightOf = (
  columns: readonly ColumnBox[],
  clientX: number
): Option.Option<Readonly<{ index: number; box: ColumnBox }>> =>
  pipe(
    Array.findFirstIndex(columns, ({ right }) => clientX <= right),
    Option.flatMap((index) =>
      Option.map(Array.get(columns, index), (box) => ({ index, box }))
    )
  );

const slotsAbove = (slotMiddles: readonly number[], clientY: number): number =>
  Array.filter(slotMiddles, (middle) => middle < clientY).length;

export const targetAtPoint = (
  columns: readonly ColumnBox[],
  clientX: number,
  clientY: number,
  slotMiddlesOf: (index: number) => readonly number[]
): Target =>
  Option.match(columnUnderOrRightOf(columns, clientX), {
    onNone: () => gapBefore(columns, columns.length),
    onSome: ({ index, box }) => {
      const band = gapBandOf(box);

      if (clientX < box.left + band) {
        return gapBefore(columns, index);
      } else if (clientX > box.right - band) {
        return gapBefore(columns, index + 1);
      }

      return Target.Into({
        columnId: box.id,
        index: slotsAbove(slotMiddlesOf(index), clientY),
      });
    },
  });

const COLUMN_WIDTH_FLOOR = 0.1;
const PANE_SHARE_FLOOR = 0.05;
const PRECISION = 10_000;

const rounded = (value: number): number =>
  Math.round(value * PRECISION) / PRECISION;

const precisionFinerThan = (floor: number): number =>
  Math.max(PRECISION, 10 ** Math.ceil(-Math.log10(floor)));

const roundedOver = (weight: number, floor: number): number => {
  const precision = precisionFinerThan(floor);
  const scaled = weight * precision;
  const isScalable = globalThis.Number.isFinite(scaled);

  return isScalable ? Math.round(scaled) / precision : weight;
};

const resizedColumn = (
  layout: Layout,
  columnId: string,
  share: number
): Option.Option<Resize> =>
  Option.map(columnOf(layout, columnId), (column) =>
    OutMessage.ResizedColumn({
      columnId,
      width: rounded(
        Number.clamp(column.width + share, {
          minimum: COLUMN_WIDTH_FLOOR,
          maximum: 1,
        })
      ),
    })
  );

const paneWeightFloor = (total: number, pair: number): number =>
  Math.max(
    Math.min(total * PANE_SHARE_FLOOR, pair / 2),
    globalThis.Number.MIN_VALUE
  );

const sharedPair = (
  column: Column,
  above: Pane,
  below: Pane,
  share: number
): Resize => {
  const total = Number.sumAll(Array.map(column.panes, ({ weight }) => weight));
  const pair = above.weight + below.weight;
  const floor = paneWeightFloor(total, pair);

  const nextAbove = Number.clamp(above.weight + share * total, {
    minimum: floor,
    maximum: pair - floor,
  });

  const isShareMovable = globalThis.Number.isFinite(total);

  return OutMessage.ResizedPanes({
    columnId: column.id,
    weights: isShareMovable
      ? {
          [above.id]: roundedOver(nextAbove, floor),
          [below.id]: roundedOver(pair - nextAbove, floor),
        }
      : { [above.id]: above.weight, [below.id]: below.weight },
  });
};

export const resizeOf = (
  layout: Layout,
  splitter: Splitter,
  share: number
): Option.Option<Resize> =>
  Splitter.match(splitter, {
    Width: ({ columnId }) => resizedColumn(layout, columnId, share),
    Split: ({ abovePaneId }) =>
      Option.flatMap(
        placeOf(layout, abovePaneId),
        ({ column, row, pane: above }) =>
          Option.map(Array.get(column.panes, row + 1), (below) =>
            sharedPair(column, above, below, share)
          )
      ),
  });

export const isSplitterPresent = (
  layout: Layout,
  splitter: Splitter
): boolean => Option.isSome(resizeOf(layout, splitter, 0));
