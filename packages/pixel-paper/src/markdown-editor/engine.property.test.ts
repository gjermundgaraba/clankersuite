// @vitest-environment node
import { ensureSyntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { it } from "@effect/vitest";
import { Schema } from "effect";
import { describe, expect } from "vite-plus/test";

import {
  accessExtension,
  editorState,
  emission,
  externalChange,
} from "./engine.ts";

const MarkdownLine = Schema.Literals([
  "",
  "# Heading",
  "- [ ] task",
  "1. item",
  "| a | b |",
  "| - | - |",
  "**bold** and _emphasis_",
  "[link](https://example.com)",
  "`code` ",
  "> quote",
  "    indented",
  "---",
]);

const LfText = Schema.Struct({
  text: Schema.String,
  lines: Schema.Array(MarkdownLine).check(Schema.isMaxLength(12)),
  tail: Schema.Literals(["", " ", "\n", "\t\n", " \n\n"]),
});

const Position = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 4096 })
);

const lfOnly = (text: string): string => text.replaceAll("\r", "");

const lfTextOf = ({ text, lines, tail }: typeof LfText.Type): string =>
  `${lfOnly(text)}\n${lines.join("\n")}${tail}`;

const TWO_CRLF_TABLES = [
  "# Fixture",
  "",
  "| a | b |",
  "| - | - |",
  "| 1 | 2 |",
  "",
  "Between them.",
  "",
  "| c | d |",
  "| - | - |",
  "| 3 | 4 |",
  "",
].join("\r\n");

const tableCount = (state: EditorState): number => {
  let count = 0;

  ensureSyntaxTree(state, state.doc.length, 5000)?.iterate({
    enter: (node) => {
      if (node.name === "Table") {
        count += 1;
      }
    },
  });

  return count;
};

describe("the editor's state", () => {
  it.prop(
    "keeps LF text exactly, going in and coming back out",
    { input: LfText },
    ({ input }) => {
      const text = lfTextOf(input);

      const typed = editorState("").update({
        changes: { from: 0, insert: text },
      });

      return (
        editorState(text).doc.toString() === text &&
        emission([typed], typed.state) === text
      );
    }
  );

  it.prop(
    "one insertion changes the text by that insertion and nothing else",
    { input: LfText, inserted: Schema.String, position: Position },
    ({ input, inserted, position }) => {
      const text = lfTextOf(input);
      const insert = `typed ${lfOnly(inserted)}`;
      const from = Math.min(position, text.length);

      const transaction = editorState(text).update({
        changes: { from, insert },
      });

      return (
        emission([transaction], transaction.state) ===
        `${text.slice(0, from)}${insert}${text.slice(from)}`
      );
    }
  );

  it.prop(
    "emits nothing when no local edit changed the text",
    { input: LfText, outside: LfText, position: Position },
    ({ input, outside, position }) => {
      const text = lfTextOf(input);
      const state = editorState(text);

      const moved = state.update({
        selection: { anchor: Math.min(position, text.length) },
      });

      const remote = state.update(externalChange(state, lfTextOf(outside)));

      return (
        emission([moved], moved.state) === undefined &&
        emission([remote], remote.state) === undefined &&
        emission([], state) === undefined
      );
    }
  );

  it.prop(
    "an outside value lands exactly, with its line endings made LF",
    { input: LfText, outside: LfText },
    ({ input, outside }) => {
      const state = editorState(lfTextOf(input));
      const stored = lfTextOf(outside);

      const { state: next } = state.update(
        externalChange(state, stored.replaceAll("\n", "\r\n"))
      );

      return next.doc.toString() === stored;
    }
  );

  it("parses a CRLF document as it parses LF, with both tables", () => {
    expect(tableCount(editorState(TWO_CRLF_TABLES))).toBe(2);
  });

  it("refuses a local edit while read-only, and lets an outside value in", () => {
    const state = editorState("held", accessExtension({}, true));
    const typed = state.update({ changes: { from: 0, insert: "x" } });
    const remote = state.update(externalChange(state, "changed elsewhere"));

    expect(typed.state.doc.toString()).toBe("held");
    expect(remote.state.doc.toString()).toBe("changed elsewhere");
  });
});
