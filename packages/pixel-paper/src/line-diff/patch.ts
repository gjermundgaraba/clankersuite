import { Array, Option, Record, String, pipe } from "effect";

import { diffRowsOfPatch, hunksOfPatch } from "./diff.ts";
import type { DiffRow } from "./diff.ts";

const ESCAPED_BYTES: Record.ReadonlyRecord<string, number> = {
  a: 7,
  b: 8,
  t: 9,
  n: 10,
  v: 11,
  f: 12,
  r: 13,
};

const QUOTED_PART = /\\(?<octal>[0-7]{3})|\\(?<escaped>.)|[^\\]+/gu;

const bytesOf = (text: string): readonly number[] => [
  ...new TextEncoder().encode(text),
];

const bytesOfPart = (match: RegExpExecArray): readonly number[] => {
  const [part] = match;
  const octal = match.groups?.["octal"];
  const escaped = match.groups?.["escaped"];

  if (octal !== undefined) {
    return [Number.parseInt(octal, 8)];
  } else if (escaped === undefined) {
    return bytesOf(part);
  }

  return Option.match(Record.get(ESCAPED_BYTES, escaped), {
    onNone: () => bytesOf(escaped),
    onSome: (byte) => [byte],
  });
};

/** The name a path in git's header stands for: git C-quotes a name with unusual bytes
 *  (`"caf\303\251.txt"`), and leaves any other as it is. */
export const unquoted = (path: string): string =>
  path.length >= 2 && path.startsWith('"') && path.endsWith('"')
    ? new TextDecoder().decode(
        Uint8Array.from(
          Array.flatMap(
            Array.fromIterable(path.slice(1, -1).matchAll(QUOTED_PART)),
            bytesOfPart
          )
        )
      )
    : path;

const GIT_SECTION = "diff --git ";

const headOf = (section: string): readonly string[] =>
  Array.takeWhile(
    section.split("\n"),
    (line) => !line.startsWith("@@") && !line.startsWith("--- ")
  );

const valueAfter = (
  head: readonly string[],
  prefix: string
): Option.Option<string> =>
  pipe(
    Array.findFirst(head, String.startsWith(prefix)),
    Option.map((line) => line.slice(prefix.length))
  );

const hasLine = (head: readonly string[], prefix: string): boolean =>
  Option.isSome(valueAfter(head, prefix));

const hasHunk = (section: string): boolean =>
  Array.some(section.split("\n"), String.startsWith("@@ "));

const sectionsOf = (patch: string): readonly string[] => {
  const [first = "", ...others] = patch.split(/(?=^diff --git )/mu);

  return Array.isArrayNonEmpty(others) && !first.startsWith(GIT_SECTION)
    ? others
    : [first, ...others];
};

export const SAME_NOTE = "No difference: both sides hold the same text.";
const UNREADABLE_NOTE = "This diff cannot be shown as lines.";
const BINARY_NOTE = "A binary file: its change has no lines.";

type Table = Readonly<{
  rows: readonly DiffRow[];
  maybeSide: Option.Option<string>;
}>;

export type PatchReading = Readonly<{
  maybeRenamedFrom: Option.Option<string>;
  notes: readonly string[];
  tables: readonly Table[];
}>;

const unreadable: PatchReading = {
  maybeRenamedFrom: Option.none(),
  notes: [UNREADABLE_NOTE],
  tables: [],
};

const lineNote = (
  head: readonly string[],
  hasRows: boolean
): Option.Option<string> => {
  if (hasLine(head, "Binary files ") || hasLine(head, "GIT binary patch")) {
    return Option.some(BINARY_NOTE);
  } else if (hasRows) {
    return Option.none();
  } else if (hasLine(head, "new file mode ")) {
    return Option.some("New empty file.");
  } else if (hasLine(head, "deleted file mode ")) {
    return Option.some("Deleted empty file.");
  }

  return Option.none();
};

type RowsOf = (section: string) => Option.Option<readonly DiffRow[]>;

const readSection = (section: string, rowsOf: RowsOf): PatchReading => {
  const head = headOf(section);
  const maybeRows = rowsOf(section);

  const maybeRenamedFrom = Option.map(
    valueAfter(head, "rename from "),
    unquoted
  );

  const notes = [
    ...Option.toArray(
      Option.map(maybeRenamedFrom, (from) => `Renamed from ${from}.`)
    ),
    ...Option.toArray(
      Option.map(
        Option.all({
          before: valueAfter(head, "old mode "),
          after: valueAfter(head, "new mode "),
        }),
        ({ before, after }) => `Mode ${before} → ${after}.`
      )
    ),
    ...Option.toArray(lineNote(head, Option.isSome(maybeRows))),
  ];

  const isUnread =
    Option.isNone(maybeRows) && (hasHunk(section) || Array.isArrayEmpty(notes));

  return isUnread
    ? unreadable
    : {
        maybeRenamedFrom,
        notes,
        tables: Option.toArray(
          Option.map(maybeRows, (rows) => ({ rows, maybeSide: Option.none() }))
        ),
      };
};

const KINDS: Record.ReadonlyRecord<string, string> = {
  "100644": "a file",
  "100755": "an executable file",
  "120000": "a symlink",
  "160000": "a submodule",
};

const kindOf = (mode: string): string =>
  Option.getOrElse(Record.get(KINDS, mode), () => `mode ${mode}`);

const sideTable = (
  section: string,
  side: string,
  rowsOf: RowsOf
): readonly Table[] =>
  Option.toArray(
    Option.map(rowsOf(section), (rows) => ({
      rows,
      maybeSide: Option.some(side),
    }))
  );

const readTypeChange = (
  gone: string,
  added: string,
  rowsOf: RowsOf
): Option.Option<PatchReading> => {
  const [goneHead, addedHead] = [headOf(gone), headOf(added)];

  return Option.flatMap(
    Option.all({
      before: valueAfter(goneHead, "deleted file mode "),
      after: valueAfter(addedHead, "new file mode "),
    }),
    ({ before, after }) =>
      goneHead[0] === addedHead[0]
        ? Option.some({
            maybeRenamedFrom: Option.none(),
            notes: [`It was ${kindOf(before)} and is now ${kindOf(after)}.`],
            tables: [
              ...sideTable(gone, "as it was", rowsOf),
              ...sideTable(added, "as it is", rowsOf),
            ],
          })
        : Option.none()
  );
};

const readPatchWith = (patch: string, rowsOf: RowsOf): PatchReading => {
  const text = patch.replaceAll("\r\n", "\n");

  if (String.isEmpty(String.trim(text))) {
    return { maybeRenamedFrom: Option.none(), notes: [SAME_NOTE], tables: [] };
  }

  const sections = sectionsOf(text);
  const [first, second, ...rest] = sections;

  if (first !== undefined && second === undefined) {
    return readSection(first, rowsOf);
  } else if (
    first !== undefined &&
    second !== undefined &&
    Array.isArrayEmpty(rest)
  ) {
    return Option.getOrElse(
      readTypeChange(first, second, rowsOf),
      () => unreadable
    );
  }

  return unreadable;
};

export const readPatch = (patch: string): PatchReading =>
  readPatchWith(patch, diffRowsOfPatch);

/** What a patch says beyond its lines, as `patchView` prints it. */
export type PatchDescription = Readonly<{
  /** The path a rename left, unquoted: for a heading such as `old.txt → new.txt`. */
  maybeRenamedFrom: Option.Option<string>;
  /** The sentences `patchView` prints above the patch's lines, or in their place: a rename,
   *  a mode change, a type change, an empty or binary file, no difference, or a patch it
   *  cannot show as lines. */
  notes: readonly string[];
}>;

/** What `patchView` says about a patch from `git diff`, read from its header: the notes it
 *  prints (`["Renamed from old.txt."]`), for a caller that prints them itself, and the path a
 *  rename left. */
export const describePatch = (patch: string): PatchDescription => {
  const { maybeRenamedFrom, notes } = readPatchWith(patch, (section) =>
    Option.as(hunksOfPatch(section), [])
  );

  return { maybeRenamedFrom, notes };
};
