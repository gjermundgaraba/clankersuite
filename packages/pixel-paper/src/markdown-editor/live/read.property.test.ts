import { RangeSet } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { it } from "@effect/vitest";
import { Schema } from "effect";
import { describe, expect } from "vite-plus/test";

import { editorState, readExtension } from "../engine.ts";
import { liveDecorations } from "./live.ts";

const Line = Schema.Literals([
  "",
  "plain",
  "# Heading",
  "- [ ] task",
  "- [x] done",
  "- item",
  "> quote",
  "**bold**, _em_, ~~gone~~ and `code`",
  "[link](https://example.com) and <https://example.com/auto>",
  "see www.example.com",
  "a\\*escaped\\*",
  "![one line](https://example.com/a.png)",
  "| a | b |",
  "| - | - |",
  "---",
]);

const Reading = Schema.Struct({
  lines: Schema.Array(Line).check(Schema.isMaxLength(16)),
  caret: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1024 })),
  isFocused: Schema.Boolean,
});

const decorationsOf = (
  text: string,
  extensions: Extension,
  caret = 0,
  isFocused = false
) => {
  const { state } = editorState(text, extensions).update({
    selection: { anchor: Math.min(caret, text.length) },
  });

  return {
    state,
    decorations: liveDecorations(
      state,
      [{ from: 0, to: state.doc.length }],
      isFocused
    ),
  };
};

const isAnchor = Schema.is(
  Schema.Struct({
    tagName: Schema.Literal("a"),
    attributes: Schema.Struct({ href: Schema.String }),
  })
);

const anchorsIn = (text: string, extensions: Extension = readExtension) => {
  const { state, decorations } = decorationsOf(text, extensions);
  const anchors: Array<Readonly<{ text: string; href: string }>> = [];

  decorations.between(0, state.doc.length, (from, to, decoration) => {
    const spec: unknown = decoration.spec;

    if (isAnchor(spec)) {
      anchors.push({
        text: state.sliceDoc(from, to),
        href: spec.attributes.href,
      });
    }
  });

  return anchors;
};

describe("a read view's decorations", () => {
  it.prop(
    "hide the same marks wherever the caret is and whether or not it has focus",
    { reading: Reading },
    ({ reading: { lines, caret, isFocused } }) => {
      const text = lines.join("\n");
      const atRest = decorationsOf(text, readExtension);
      const moved = decorationsOf(text, readExtension, caret, isFocused);

      return RangeSet.eq([moved.decorations], [atRest.decorations]);
    }
  );

  it.each([
    ["https://example.com/a", "https://example.com/a"],
    ["<https://example.com/a b>", "https://example.com/a%20b"],
    ["mailto:someone@example.com", "mailto:someone@example.com"],
    ["javascript:alert(1)", undefined],
    ["JaVaScRiPt:alert(1)", undefined],
    ["data:text/html,hi", undefined],
    ["file:///etc/hosts", undefined],
  ])("draw [a](%s) as an anchor to %s", (destination, href) => {
    const anchors = anchorsIn(`[a](${destination})`);

    expect(anchors).toStrictEqual(
      href === undefined ? [] : [{ text: `[a](${destination})`, href }]
    );
  });

  it("draw bare, www and email links as anchors to where they lead", () => {
    expect(
      anchorsIn(
        "<https://example.com/auto> www.example.com someone@example.com"
      )
    ).toStrictEqual([
      { text: "https://example.com/auto", href: "https://example.com/auto" },
      { text: "www.example.com", href: "https://www.example.com/" },
      { text: "someone@example.com", href: "mailto:someone@example.com" },
    ]);
  });

  it("draw no anchor in an editor", () => {
    expect(anchorsIn("[a](https://example.com)", [])).toStrictEqual([]);
  });
});
