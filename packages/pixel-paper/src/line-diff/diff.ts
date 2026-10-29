import { diffLines, parsePatch } from "diff";
import type { StructuredPatchHunk } from "diff";
import { Array, Match, Option, Record, Schema, pipe } from "effect";
import { defineTaggedUnion } from "foldkit/schema";

export const DiffRow = defineTaggedUnion({
  Same: {
    text: Schema.String,
    oldNumber: Schema.Finite,
    newNumber: Schema.Finite,
  },
  Added: { text: Schema.String, newNumber: Schema.Finite },
  Removed: { text: Schema.String, oldNumber: Schema.Finite },
  Fold: { count: Schema.Finite, firstOldNumber: Schema.Finite },
});

export type DiffRow = typeof DiffRow.Type;

type SameRow = Extract<DiffRow, Readonly<{ _tag: "Same" }>>;

export type LineKind = "Same" | "Added" | "Removed";

type Numbers = Readonly<{ old: number; new: number }>;

const withFinalNewline = (text: string): string =>
  text.endsWith("\n") ? text : `${text}\n`;

const changeKind = (
  change: Readonly<{ added: boolean; removed: boolean }>
): LineKind =>
  Match.value(change).pipe(
    Match.withReturnType<LineKind>(),
    Match.when({ added: true }, () => "Added"),
    Match.when({ removed: true }, () => "Removed"),
    Match.orElse(() => "Same")
  );

const numberLine = (
  numbers: Numbers,
  kind: LineKind,
  text: string
): [Numbers, DiffRow] =>
  Match.value(kind).pipe(
    Match.withReturnType<[Numbers, DiffRow]>(),
    Match.when("Same", () => [
      { old: numbers.old + 1, new: numbers.new + 1 },
      DiffRow.Same({ text, oldNumber: numbers.old, newNumber: numbers.new }),
    ]),
    Match.when("Added", () => [
      { old: numbers.old, new: numbers.new + 1 },
      DiffRow.Added({ text, newNumber: numbers.new }),
    ]),
    Match.when("Removed", () => [
      { old: numbers.old + 1, new: numbers.new },
      DiffRow.Removed({ text, oldNumber: numbers.old }),
    ]),
    Match.exhaustive
  );

type Line = Readonly<{ kind: LineKind; text: string }>;

const numbered = (
  lines: readonly Line[],
  from: Numbers
): readonly [Numbers, readonly DiffRow[]] =>
  Array.mapAccum(lines, from, (numbers, { kind, text }) =>
    numberLine(numbers, kind, text)
  );

export const diffRowsOf = (before: string, after: string): readonly DiffRow[] =>
  pipe(
    diffLines(withFinalNewline(before), withFinalNewline(after)),
    Array.flatMap((change) =>
      Array.map(change.value.slice(0, -1).split("\n"), (text) => ({
        kind: changeKind(change),
        text,
      }))
    ),
    (lines) => numbered(lines, { old: 1, new: 1 })[1]
  );

const isChange = (row: DiffRow): boolean =>
  row._tag === "Added" || row._tag === "Removed";

export const hasChanges = (rows: readonly DiffRow[]): boolean =>
  Array.some(rows, isChange);

const LINE_KIND_BY_PREFIX: Record.ReadonlyRecord<string, LineKind> = {
  " ": "Same",
  "+": "Added",
  "-": "Removed",
};

const kindOf = (line: string): Option.Option<LineKind> =>
  line === ""
    ? Option.some("Same")
    : Record.get(LINE_KIND_BY_PREFIX, line.charAt(0));

const linesOf = (hunk: StructuredPatchHunk): readonly Line[] =>
  Array.getSomes(
    Array.map(hunk.lines, (line) =>
      Option.map(kindOf(line), (kind) => ({ kind, text: line.slice(1) }))
    )
  );

const readHunk = (
  nextOld: number,
  hunk: StructuredPatchHunk
): readonly [number, readonly DiffRow[]] => {
  const gap = hunk.oldStart - nextOld;

  const [end, rows] = numbered(linesOf(hunk), {
    old: hunk.oldStart,
    new: hunk.newStart,
  });

  return [
    end.old,
    gap > 0
      ? [DiffRow.Fold({ count: gap, firstOldNumber: nextOld }), ...rows]
      : rows,
  ];
};

const onlyHunksOf = (
  files: ReadonlyArray<Readonly<{ hunks: StructuredPatchHunk[] }>>
): Option.Option<Array.NonEmptyReadonlyArray<StructuredPatchHunk>> =>
  Array.match(files, {
    onEmpty: () => Option.none(),
    onNonEmpty: ([file, ...others]) =>
      Array.isArrayEmpty(others) && Array.isArrayNonEmpty(file.hunks)
        ? Option.some(file.hunks)
        : Option.none(),
  });

export const hunksOfPatch = (
  patch: string
): Option.Option<Array.NonEmptyReadonlyArray<StructuredPatchHunk>> =>
  Option.flatMap(Option.liftThrowable(parsePatch)(patch), onlyHunksOf);

export const diffRowsOfPatch = (
  patch: string
): Option.Option<readonly DiffRow[]> =>
  Option.map(hunksOfPatch(patch), (hunks) =>
    Array.flatten(Array.mapAccum(hunks, 1, readHunk)[1])
  );

type Run = Readonly<{ first: SameRow; count: number }>;

const runRows = (maybeRun: Option.Option<Run>): readonly DiffRow[] =>
  Option.match(maybeRun, {
    onNone: () => [],
    onSome: ({ first, count }) =>
      count === 1
        ? [first]
        : [DiffRow.Fold({ count, firstOldNumber: first.oldNumber })],
  });

export const foldUnchanged = (
  rows: readonly DiffRow[],
  context: number
): readonly DiffRow[] => {
  const changesBefore = Array.scan(
    rows,
    0,
    (count, row) => count + (isChange(row) ? 1 : 0)
  );

  const isKept = (index: number): boolean =>
    Array.getUnsafe(changesBefore, Math.min(rows.length, index + context + 1)) -
      Array.getUnsafe(changesBefore, Math.max(0, index - context)) >
    0;

  const [maybeRun, kept] = Array.mapAccum(
    rows,
    Option.none<Run>(),
    (
      maybeRunSoFar,
      row,
      index
    ): readonly [Option.Option<Run>, readonly DiffRow[]] =>
      row._tag === "Same" && !isKept(index)
        ? [
            Option.some(
              Option.match(maybeRunSoFar, {
                onNone: () => ({ first: row, count: 1 }),
                onSome: (run) => ({ ...run, count: run.count + 1 }),
              })
            ),
            [],
          ]
        : [Option.none(), [...runRows(maybeRunSoFar), row]]
  );

  return [...Array.flatten(kept), ...runRows(maybeRun)];
};
