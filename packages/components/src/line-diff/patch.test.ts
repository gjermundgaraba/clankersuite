import { Array, Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import * as Patch from "./patch.ts";

const EDITED = `diff --git a/kept.txt b/kept.txt
index 814f4a4..99b356d 100644
--- a/kept.txt
+++ b/kept.txt
@@ -1,2 +1,2 @@
 one
-two
+2
`;

const RENAMED = `diff --git a/moved.txt b/moved again.txt
similarity index 100%
rename from moved.txt
rename to moved again.txt
`;

const RENAMED_AND_EDITED = `diff --git a/edited-move.txt b/edited move.txt
similarity index 91%
rename from edited-move.txt
rename to edited move.txt
index 9581a92..b51c2bc 100644
--- a/edited-move.txt
+++ b/edited move.txt\t
@@ -11,2 +11,2 @@ line 10
 line 11
-before
+after
`;

const MODE = `diff --git a/script.sh b/script.sh
old mode 100644
new mode 100755
`;

const MODE_AND_EDITED = `diff --git a/script.sh b/script.sh
old mode 100644
new mode 100755
index 1111111..2222222
--- a/script.sh
+++ b/script.sh
@@ -1 +1 @@
-echo one
+echo two
`;

const NEW_EMPTY = `diff --git a/untracked/empty b/untracked/empty
new file mode 100644
index 0000000..e69de29
`;

const DELETED_EMPTY = `diff --git a/gone/empty b/gone/empty
deleted file mode 100644
index e69de29..0000000
`;

const DELETED = `diff --git a/gone.txt b/gone.txt
deleted file mode 100644
index b023018..0000000
--- a/gone.txt
+++ /dev/null
@@ -1 +0,0 @@
-bye
`;

const BINARY = `diff --git a/image.bin b/image.bin
index 88768ef..3e3315e 100644
Binary files a/image.bin and b/image.bin differ
`;

const NEW_BINARY = `diff --git a/logo.png b/logo.png
new file mode 100644
index 0000000..3e3315e
Binary files /dev/null and b/logo.png differ
`;

const TRICKY = `diff --git a/notes.md b/notes.md
index 1111111..2222222 100644
--- a/notes.md
+++ b/notes.md
@@ -1 +1,2 @@
 keep
+rename from somewhere
`;

const BECAME_LINK = `diff --git a/to-link b/to-link
deleted file mode 100644
index 7898192..0000000
--- a/to-link
+++ /dev/null
@@ -1 +0,0 @@
-a
diff --git a/to-link b/to-link
new file mode 120000
index 0000000..72ad13c
--- /dev/null
+++ b/to-link
@@ -0,0 +1 @@
+kept.txt
\\ No newline at end of file
`;

const QUOTED_RENAME = `diff --git "a/caf\\303\\251.txt" "b/na\\303\\257ve.txt"
similarity index 100%
rename from "caf\\303\\251.txt"
rename to "na\\303\\257ve.txt"
`;

const SHOWN_COMMIT = `commit 0123456789abcdef0123456789abcdef01234567
Author: Sample Author <author@example.com>

    Say two as a number

${EDITED}`;

const UNREADABLE = ["This diff cannot be shown as lines."];

const tablesOf = (patch: string) => Patch.readPatch(patch).tables;

describe("what a patch from git says about its file", () => {
  it("an edit has lines and nothing more to say", () => {
    expect(Patch.describePatch(EDITED)).toStrictEqual({
      maybeRenamedFrom: Option.none(),
      notes: [],
    });
  });

  it("a rename names the path it left, above its lines when it was edited too", () => {
    expect(Patch.describePatch(RENAMED)).toStrictEqual({
      maybeRenamedFrom: Option.some("moved.txt"),
      notes: ["Renamed from moved.txt."],
    });
    expect(Patch.describePatch(RENAMED_AND_EDITED)).toStrictEqual({
      maybeRenamedFrom: Option.some("edited-move.txt"),
      notes: ["Renamed from edited-move.txt."],
    });
  });

  it("a mode change gives both modes, above its lines when it was edited too", () => {
    expect(Patch.describePatch(MODE).notes).toStrictEqual([
      "Mode 100644 → 100755.",
    ]);
    expect(tablesOf(MODE)).toHaveLength(0);
    expect(Patch.describePatch(MODE_AND_EDITED).notes).toStrictEqual([
      "Mode 100644 → 100755.",
    ]);
    expect(tablesOf(MODE_AND_EDITED)).toHaveLength(1);
  });

  it("an empty file that came or went says so; one with lines lets them say it", () => {
    expect(Patch.describePatch(NEW_EMPTY).notes).toStrictEqual([
      "New empty file.",
    ]);
    expect(Patch.describePatch(DELETED_EMPTY).notes).toStrictEqual([
      "Deleted empty file.",
    ]);
    expect(Patch.describePatch(DELETED)).toStrictEqual({
      maybeRenamedFrom: Option.none(),
      notes: [],
    });
  });

  it("a binary change, new or changed, has no lines", () => {
    expect(Patch.describePatch(BINARY)).toStrictEqual({
      maybeRenamedFrom: Option.none(),
      notes: ["A binary file: its change has no lines."],
    });
    expect(Patch.describePatch(NEW_BINARY).notes).toStrictEqual([
      "A binary file: its change has no lines.",
    ]);
  });

  it.each([
    ["an edit", EDITED, 1],
    ["a rename", RENAMED, 0],
    ["a rename with an edit", RENAMED_AND_EDITED, 1],
    ["a deletion with lines", DELETED, 1],
    ["a new empty file", NEW_EMPTY, 0],
    ["a binary change", BINARY, 0],
    ["text that is not a diff", "not a diff", 0],
  ])("draws a table only for the lines it has: %s", (_case, patch, count) => {
    expect(tablesOf(patch)).toHaveLength(count);
  });

  it("reads only the header: a changed line that looks like one says nothing", () => {
    expect(Patch.describePatch(TRICKY).notes).toStrictEqual([]);
  });

  it("a file whose type changed is two sections under one note, a table for each side", () => {
    expect(Patch.describePatch(BECAME_LINK)).toStrictEqual({
      maybeRenamedFrom: Option.none(),
      notes: ["It was a file and is now a symlink."],
    });
    expect(
      Array.map(tablesOf(BECAME_LINK), ({ rows, maybeSide }) => [
        rows.length,
        maybeSide,
      ])
    ).toStrictEqual([
      [1, Option.some("as it was")],
      [1, Option.some("as it is")],
    ]);
  });

  it("a path git quoted is read back as the name it stands for", () => {
    expect(Patch.describePatch(QUOTED_RENAME).notes).toStrictEqual([
      "Renamed from café.txt.",
    ]);
    expect(Patch.unquoted('"tab\\there \\"q\\" back\\\\slash"')).toBe(
      'tab\there "q" back\\slash'
    );
    expect(Patch.unquoted("plain name.txt")).toBe("plain name.txt");
  });

  it("reads past what comes before the first file, such as a commit's message", () => {
    expect(Patch.describePatch(SHOWN_COMMIT)).toStrictEqual(
      Patch.describePatch(EDITED)
    );
  });

  it("reads a CRLF patch as it reads the same patch with LF", () => {
    expect(
      Patch.describePatch(RENAMED.replaceAll("\n", "\r\n")).notes
    ).toStrictEqual(["Renamed from moved.txt."]);
    expect(Patch.readPatch(EDITED.replaceAll("\n", "\r\n"))).toStrictEqual(
      Patch.readPatch(EDITED)
    );
  });

  it("says there is no difference in an empty patch", () => {
    expect(Patch.describePatch(" \n").notes).toStrictEqual([
      "No difference: both sides hold the same text.",
    ]);
  });

  it("says what reading the whole patch says, for every kind of patch", () => {
    const patches = [
      EDITED,
      RENAMED,
      RENAMED_AND_EDITED,
      MODE,
      MODE_AND_EDITED,
      NEW_EMPTY,
      DELETED_EMPTY,
      DELETED,
      BINARY,
      NEW_BINARY,
      TRICKY,
      BECAME_LINK,
      QUOTED_RENAME,
      SHOWN_COMMIT,
      " \n",
      "not a diff\nat all",
      `${RENAMED}--- a/moved.txt\n+++ b/moved again.txt\n@@ -1,3 +1,3 @@\n a\n`,
      `${EDITED}${DELETED}`,
    ];

    expect(Array.map(patches, Patch.describePatch)).toStrictEqual(
      Array.map(patches, (patch) => {
        const { maybeRenamedFrom, notes } = Patch.readPatch(patch);

        return { maybeRenamedFrom, notes };
      })
    );
  });

  it.each([
    ["text that is not a diff", "not a diff\nat all"],
    [
      "a git header that says nothing",
      "diff --git a/x b/x\nindex 1111111..2222222 100644\n",
    ],
    [
      "a broken hunk under a rename",
      `${RENAMED}--- a/moved.txt\n+++ b/moved again.txt\n@@ -1,3 +1,3 @@\n a\n`,
    ],
    ["two files", `${EDITED}${DELETED}`],
    ["a deletion and an addition of two paths", `${DELETED}${NEW_EMPTY}`],
    ["three files", `${EDITED}${RENAMED}${MODE}`],
  ])("cannot show %s as lines", (_case, patch) => {
    expect(Patch.describePatch(patch)).toStrictEqual({
      maybeRenamedFrom: Option.none(),
      notes: UNREADABLE,
    });
  });
});
