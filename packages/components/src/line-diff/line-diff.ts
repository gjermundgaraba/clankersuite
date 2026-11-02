import { Array, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";
import { DiffRow } from "./diff.ts";
import type { LineKind } from "./diff.ts";
import { SAME_NOTE, readPatch } from "./patch.ts";

const COLUMN_COUNT = 4;

/** Configuration for rendering a unified diff with `patchView`. */
export type PatchViewConfig = Readonly<{
  /** One file's unified diff, as `diff -u` or `git diff -- <path>` writes it, its git header
   *  included. */
  patch: string;
  /** Names the two sides for screen readers: `"Version 3 against version 4"`. */
  label: string;
}>;

const KIND: Record<
  LineKind,
  Readonly<{ className: string; sign: string; said: string }>
> = {
  Same: { className: "same", sign: "", said: "unchanged" },
  Added: { className: "add", sign: "+", said: "added" },
  Removed: { className: "del", sign: "−", said: "removed" },
};

const lineView = <Message>(
  kind: LineKind,
  numbers: Readonly<{ old: string; new: string }>,
  text: string,
  h: HtmlBuilder<Message>
): Html => {
  const { className, sign, said } = KIND[kind];

  return h.keyed("tr")(
    `${numbers.old}:${numbers.new}`,
    [h.Class(className)],
    [
      h.td([h.Class("ln")], [numbers.old]),
      h.td([h.Class("ln")], [numbers.new]),
      h.td([h.Class("sign"), h.AriaLabel(said)], [sign]),
      h.td([h.Class("line")], [text === "" ? " " : text]),
    ]
  );
};

const foldView = <Message>(
  count: number,
  firstOldNumber: number,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("tr")(
    `fold-${firstOldNumber}`,
    [h.Class("fold")],
    [
      h.td(
        [h.Colspan(COLUMN_COUNT)],
        [
          `${count.toLocaleString(LOCALE)} unchanged ${count === 1 ? "line" : "lines"}`,
        ]
      ),
    ]
  );

const rowView = <Message>(row: DiffRow, h: HtmlBuilder<Message>): Html =>
  DiffRow.match(row, {
    Same: ({ text, oldNumber, newNumber }) =>
      lineView("Same", { old: `${oldNumber}`, new: `${newNumber}` }, text, h),
    Added: ({ text, newNumber }) =>
      lineView("Added", { old: "", new: `${newNumber}` }, text, h),
    Removed: ({ text, oldNumber }) =>
      lineView("Removed", { old: `${oldNumber}`, new: "" }, text, h),
    Fold: ({ count, firstOldNumber }) => foldView(count, firstOldNumber, h),
  });

const noteView = <Message>(note: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Class("note-line")], [note]);

const tableView = <Message>(
  rows: readonly DiffRow[],
  label: string,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("diff-wrap")],
    [
      h.table(
        [h.AriaLabel(label), h.Class("diff")],
        [
          h.tbody(
            [],
            Array.map(rows, (row) => rowView(row, h))
          ),
        ]
      ),
    ]
  );

/** A unified diff the caller already has (from a server, or `git diff -- <path>`) as a ruled
 *  table: the old and new numbers, a sign, the line. Added lines sit on the head tint behind an
 *  ink +; removed lines go muted behind a red −, and each sign is named for screen readers. Its
 *  hunks' lines are numbered from their headers, and the unchanged lines between hunks
 *  folded into a counted row. Lines past the last hunk are not in the patch, so nothing counts
 *  them. What git's header says beyond the lines prints as a note line above the table, or in
 *  its place: a rename, a mode change, an empty or binary file (`describePatch` has the
 *  sentences). A file whose type changed (a file that became a symlink) is two sections, each
 *  its own table under one note, named for its side (`"<label>, as it was"`). An empty patch
 *  says there is no difference; text that is not a diff, or holds several
 *  files, says it cannot be shown as lines. */
export const patchView = <Message>(
  config: PatchViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { patch, label } = config;
  const { notes, tables } = readPatch(patch);

  const parts = [
    ...(Array.isReadonlyArrayNonEmpty(notes)
      ? [noteView(Array.join(notes, " "), h)]
      : []),
    ...Array.map(tables, ({ rows, maybeSide }) =>
      tableView(
        rows,
        Option.match(maybeSide, {
          onNone: () => label,
          onSome: (side) => `${label}, ${side}`,
        }),
        h
      )
    ),
  ];

  return Array.match(parts, {
    onEmpty: () => noteView(SAME_NOTE, h),
    onNonEmpty: ([part, ...others]) =>
      Array.isArrayEmpty(others)
        ? part
        : h.div([h.Class("stack gap-s")], parts),
  });
};
