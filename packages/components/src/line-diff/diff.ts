import { parsePatch } from "diff";
import type { StructuredPatchHunk } from "diff";
import { Array, Match, Option, Record, Schema } from "effect";
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

export type LineKind = "Same" | "Added" | "Removed";

type Numbers = Readonly<{ old: number; new: number }>;

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
