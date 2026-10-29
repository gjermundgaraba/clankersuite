import { Array, Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import * as Diff from "./diff.ts";
import * as LineDiff from "./line-diff.ts";

const BEFORE = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
const AFTER = ["a", "b", "c", "d", "e", "f", "G", "h"].join("\n");

const PATCH = [
  "--- a/notes.md",
  "+++ b/notes.md",
  "@@ -2,2 +2,2 @@",
  " b",
  "-c",
  "+C",
  "@@ -6,2 +6,3 @@",
  " f",
  "-g",
  "+G",
  "+H",
  "\\ No newline at end of file",
].join("\n");

const RENAME = [
  "diff --git a/old notes.md b/notes.md",
  "similarity index 90%",
  "rename from old notes.md",
  "rename to notes.md",
  "",
].join("\n");

const BECAME_LINK = [
  "diff --git a/to-link b/to-link",
  "deleted file mode 100644",
  "--- a/to-link",
  "+++ /dev/null",
  "@@ -1 +0,0 @@",
  "-a",
  "diff --git a/to-link b/to-link",
  "new file mode 120000",
  "--- /dev/null",
  "+++ b/to-link",
  "@@ -0,0 +1 @@",
  "+kept.txt",
].join("\n");

const rowText = (row: Diff.DiffRow): string =>
  Diff.DiffRow.match(row, {
    Same: ({ text, oldNumber, newNumber }) =>
      `Same ${text} ${oldNumber}:${newNumber}`,
    Added: ({ text, newNumber }) => `Added ${text} -:${newNumber}`,
    Removed: ({ text, oldNumber }) => `Removed ${text} ${oldNumber}:-`,
    Fold: ({ count, firstOldNumber }) => `Fold ${count} from ${firstOldNumber}`,
  });

const SPREAD = Diff.diffRowsOf(
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"].join(
    "\n"
  ),
  [
    "a",
    "B",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "I",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
  ].join("\n")
);

describe("LineDiff rows", () => {
  it("numbers each line on its side, and a missing final newline is no change", () => {
    expect(
      Array.map(Diff.diffRowsOf("one\ntwo", "one\nzwei\n"), rowText)
    ).toStrictEqual(["Same one 1:1", "Removed two 2:-", "Added zwei -:2"]);
    expect(Diff.hasChanges(Diff.diffRowsOf("same", "same\n"))).toBe(false);
  });

  it("keeps the context around a change and folds the rest", () => {
    expect(
      Array.map(Diff.foldUnchanged(Diff.diffRowsOf(BEFORE, AFTER), 2), rowText)
    ).toStrictEqual([
      "Fold 4 from 1",
      "Same e 5:5",
      "Same f 6:6",
      "Removed g 7:-",
      "Added G -:7",
      "Same h 8:8",
    ]);
  });

  it("keeps a run of one unchanged line as a line, never a fold of one", () => {
    const before = ["a", "b", "c", "d", "e", "f", "g"].join("\n");
    const after = ["A", "b", "c", "d", "e", "f", "G"].join("\n");
    const rows = Diff.foldUnchanged(Diff.diffRowsOf(before, after), 2);

    expect(Array.filter(rows, (row) => row._tag === "Fold")).toStrictEqual([]);
    expect(Array.length(rows)).toBe(9);
  });

  it.each([
    [
      0,
      [
        "Same a 1:1",
        "Removed b 2:-",
        "Added B -:2",
        "Fold 6 from 3",
        "Removed i 9:-",
        "Added I -:9",
        "Fold 5 from 10",
        "Added o -:15",
      ],
    ],
    [
      1,
      [
        "Same a 1:1",
        "Removed b 2:-",
        "Added B -:2",
        "Same c 3:3",
        "Fold 4 from 4",
        "Same h 8:8",
        "Removed i 9:-",
        "Added I -:9",
        "Same j 10:10",
        "Fold 3 from 11",
        "Same n 14:14",
        "Added o -:15",
      ],
    ],
    [
      2,
      [
        "Same a 1:1",
        "Removed b 2:-",
        "Added B -:2",
        "Same c 3:3",
        "Same d 4:4",
        "Fold 2 from 5",
        "Same g 7:7",
        "Same h 8:8",
        "Removed i 9:-",
        "Added I -:9",
        "Same j 10:10",
        "Same k 11:11",
        "Same l 12:12",
        "Same m 13:13",
        "Same n 14:14",
        "Added o -:15",
      ],
    ],
  ])(
    "keeps %i lines of context on each side of each change, at both ends",
    (context, folded) => {
      expect(
        Array.map(Diff.foldUnchanged(SPREAD, context), rowText)
      ).toStrictEqual(folded);
    }
  );

  it("folds nothing when the context is as long as the text", () => {
    expect(Diff.foldUnchanged(SPREAD, SPREAD.length)).toStrictEqual(SPREAD);
  });
});

describe("LineDiff patch", () => {
  it("numbers a patch's lines from its hunks and folds the lines between them", () => {
    expect(
      Option.map(Diff.diffRowsOfPatch(PATCH), Array.map(rowText))
    ).toStrictEqual(
      Option.some([
        "Fold 1 from 1",
        "Same b 2:2",
        "Removed c 3:-",
        "Added C -:3",
        "Fold 2 from 4",
        "Same f 6:6",
        "Removed g 7:-",
        "Added G -:7",
        "Added H -:8",
      ])
    );
  });

  it("numbers a hunk at the first line with no fold before it, and one after a gap", () => {
    const patch = [
      "--- a/x",
      "+++ b/x",
      "@@ -1,2 +1,2 @@",
      " same",
      "-old",
      "+new",
      "@@ -9,1 +9,1 @@",
      "-before",
      "+after",
      "\\ No newline at end of file",
      "",
    ].join("\n");

    expect(
      Option.map(Diff.diffRowsOfPatch(patch), Array.map(rowText))
    ).toStrictEqual(
      Option.some([
        "Same same 1:1",
        "Removed old 2:-",
        "Added new -:2",
        "Fold 6 from 3",
        "Removed before 9:-",
        "Added after -:9",
      ])
    );
  });

  it("reads a blank context line that lost its space as a line", () => {
    const patch =
      "@@ -1,4 +1,4 @@\n a\n\n c\n-d\n+D\n@@ -8,1 +8,1 @@\n-h\n+H\n";

    expect(
      Option.map(Diff.diffRowsOfPatch(patch), Array.map(rowText))
    ).toStrictEqual(
      Option.some([
        "Same a 1:1",
        "Same  2:2",
        "Same c 3:3",
        "Removed d 4:-",
        "Added D -:4",
        "Fold 3 from 5",
        "Removed h 8:-",
        "Added H -:8",
      ])
    );
  });

  it.each([
    ["a broken hunk", "@@ -1,3 +1,3 @@\n a\n-b\n"],
    ["text that is not a diff", "not a diff\nat all"],
    [
      "a binary change",
      "diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ\n",
    ],
    [
      "several files",
      `${PATCH}\n--- a/other.md\n+++ b/other.md\n@@ -1 +1 @@\n-x\n+y\n`,
    ],
  ])("has no rows for %s", (_case, patch) => {
    expect(Diff.diffRowsOfPatch(patch)).toStrictEqual(Option.none());
  });
});

describe("LineDiff view", () => {
  it("is a named table whose signs are said, with folded runs counted", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.view(
            {
              before: BEFORE,
              after: AFTER,
              label: "Version 3 against version 4",
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("table", { name: "Version 3 against version 4" })
      ).toExist(),
      Scene.expect(Scene.selector("tr.fold")).toHaveText("4 unchanged lines"),
      Scene.expect(Scene.selector("tr.del td.sign")).toHaveAttr(
        "aria-label",
        "removed"
      ),
      Scene.expect(Scene.selector("tr.add td.sign")).toHaveAttr(
        "aria-label",
        "added"
      ),
      Scene.expect(Scene.selector("tr.add td.line")).toHaveText("G")
    );
  });

  it("says so when both sides are the same", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.view(
            {
              before: "same",
              after: "same",
              label: "Unchanged",
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("table")).toBeAbsent(),
      Scene.expect(Scene.selector(".note-line")).toHaveText(
        "No difference: both sides hold the same text."
      )
    );
  });

  it("shows a patch as the same table, counting one folded line as one", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.patchView(
            { patch: PATCH, label: "Version 3 against version 4" },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("table", { name: "Version 3 against version 4" })
      ).toExist(),
      Scene.expect(Scene.selector("tr.fold")).toHaveText("1 unchanged line"),
      Scene.expect(Scene.selector("tr.add td.line")).toHaveText("C")
    );
  });

  it.each([
    ["", "No difference: both sides hold the same text."],
    ["not a diff", "This diff cannot be shown as lines."],
    [
      "diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ\n",
      "A binary file: its change has no lines.",
    ],
    [
      "diff --git a/a.sh b/b.sh\nold mode 100644\nnew mode 100755\nsimilarity index 100%\nrename from a.sh\nrename to b.sh\n",
      "Renamed from a.sh. Mode 100644 → 100755.",
    ],
  ])("says what a patch with no lines to show says: %j", (patch, note) => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.patchView({ patch, label: "Unchanged" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("table")).toBeAbsent(),
      Scene.expect(Scene.selector(".note-line")).toHaveText(note)
    );
  });

  it("prints what git's header says above the lines it has", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.patchView(
            { patch: `${RENAME}${PATCH}`, label: "notes.md against main" },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".stack .note-line")).toHaveText(
        "Renamed from old notes.md."
      ),
      Scene.expect(
        Scene.role("table", { name: "notes.md against main" })
      ).toExist()
    );
  });

  it("draws a type change's two sides under one note, each named for its side", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          LineDiff.patchView(
            { patch: BECAME_LINK, label: "to-link against main" },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".note-line")).toHaveText(
        "It was a file and is now a symlink."
      ),
      Scene.expect(
        Scene.role("table", { name: "to-link against main, as it was" })
      ).toExist(),
      Scene.expect(
        Scene.role("table", { name: "to-link against main, as it is" })
      ).toExist()
    );
  });
});
