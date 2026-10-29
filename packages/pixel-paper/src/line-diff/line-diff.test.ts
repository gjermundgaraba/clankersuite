import { Array, Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import * as Diff from "./diff.ts";
import * as LineDiff from "./line-diff.ts";

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
  it("is a named table whose signs are said, counting one folded line as one", () => {
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
      Scene.expect(Scene.selector("tr.del td.sign")).toHaveAttr(
        "aria-label",
        "removed"
      ),
      Scene.expect(Scene.selector("tr.add td.sign")).toHaveAttr(
        "aria-label",
        "added"
      ),
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
