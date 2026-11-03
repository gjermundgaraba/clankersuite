import { Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { afterAll, describe, expect, it } from "vite-plus/test";

import { disposeEmbedded, embed } from "./test/embed.ts";
import type { Harness } from "./test/embed.ts";
import { settleUntil } from "./test/settle.ts";

type ProgramExample = Harness<unknown, Readonly<{ _tag: string }>>;

type StaticExample = Readonly<{
  view: <Message>(h: HtmlBuilder<Message>) => Html;
}>;

const EXAMPLES = import.meta.glob<ProgramExample | StaticExample>(
  ["./*/examples/*.ts", "!./*/examples/*.test.ts"],
  { eager: true }
);

const StaticModel = Schema.Struct({});

const toProgram = (example: ProgramExample | StaticExample): ProgramExample =>
  "update" in example
    ? example
    : {
        Model: StaticModel,
        init: () => ({ model: {} }),
        update: (model) => ({ model }),
        view: (_model, h) => example.view(h),
      };

const THIRD_PARTY_CLASS = /^(?:sr-only$|cm-|tok-)/u;

describe("the classes the examples render", () => {
  afterAll(disposeEmbedded);

  it("are prefixed gg-, beside sr-only, CodeMirror's cm- and the highlighter's tok-", async () => {
    const paths = Object.keys(EXAMPLES);

    for (const example of Object.values(EXAMPLES)) {
      embed(toProgram(example));
    }

    await settleUntil(
      () => document.querySelectorAll("div[id^='harness-']:empty").length === 0,
      500
    );

    const classes = Array.from(
      document.body.querySelectorAll("[class]"),
      (element) => [...element.classList]
    ).flat();

    expect(paths.length).toBeGreaterThan(100);
    expect(document.querySelectorAll("div[id^='harness-']:empty")).toHaveLength(
      0
    );
    expect(classes.length).toBeGreaterThan(1000);
    expect(
      [...new Set(classes)].filter(
        (name) => !name.startsWith("gg-") && !THIRD_PARTY_CLASS.test(name)
      )
    ).toStrictEqual([]);
  });
});
