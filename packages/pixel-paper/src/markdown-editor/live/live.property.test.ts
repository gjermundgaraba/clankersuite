// @vitest-environment node
import { it } from "@effect/vitest";
import { Schema } from "effect";
import { describe, expect } from "vite-plus/test";

import { editorState } from "../engine.ts";
import { liveDecorations } from "./live.ts";

const Line = Schema.Literals([
  "",
  "plain",
  "# Heading",
  "- [ ] task",
  "- item",
  "1. item",
  "> quote",
  "**bold** and [link](https://example.com)",
  "![one line](https://example.com/a.png)",
  "![two",
  "lines](https://example.com/a.png)",
  "> ![quoted",
  "> image](https://example.com/q.png)",
  "![a](",
  "https://example.com/b.png",
  ")",
  "---",
]);

const Document = Schema.Struct({
  lines: Schema.Array(Line).check(Schema.isMaxLength(16)),
  caret: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1024 })),
  isFocused: Schema.Boolean,
});

const replacedTexts = (
  text: string,
  caret = 0,
  isFocused = false
): readonly string[] => {
  const { state } = editorState(text).update({
    selection: { anchor: Math.min(caret, text.length) },
  });

  const replaced: string[] = [];

  liveDecorations(
    state,
    [{ from: 0, to: state.doc.length }],
    isFocused
  ).between(0, state.doc.length, (from, to, decoration) => {
    if (decoration.point && from !== to) {
      replaced.push(state.sliceDoc(from, to));
    }
  });

  return replaced;
};

const hasNoLineBreak = (replaced: string): boolean => !replaced.includes("\n");

describe("the live decorations", () => {
  it.prop(
    "replace no line break, which CodeMirror refuses from a plugin",
    { document: Document },
    ({ document: { lines, caret, isFocused } }) =>
      replacedTexts(lines.join("\n"), caret, isFocused).every(hasNoLineBreak)
  );

  it("leave an image that spans lines as text", () => {
    expect(
      replacedTexts("![two\nlines](https://example.com/a.png)").every(
        hasNoLineBreak
      )
    ).toBe(true);
    expect(replacedTexts("![a](\nhttps://x.y\n)").every(hasNoLineBreak)).toBe(
      true
    );
  });

  it("draw an image on one line in place of its text", () => {
    const image = "![one line](https://example.com/a.png)";

    expect(replacedTexts(`plain\n${image}`)).toContain(image);
  });
});
