import type * as Markdown from "@foldkit/markdown";
import { Array } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { PAGES } from "./pages.ts";
import { isUnder } from "./token-css.ts";
import { tokensView } from "./token-table.ts";
import {
  SEMANTIC_TOKENS,
  computedValue,
  semanticTokensUnder,
} from "./tokens.ts";

const islandsIn = (
  blocks: readonly Markdown.Block[]
): readonly Markdown.Island[] =>
  Array.flatMap(blocks, (block) =>
    block._tag === "Island" ? [block, ...islandsIn(block.blocks)] : []
  );

const prefixesOnPages = Array.flatMap(PAGES, ({ document }) =>
  Array.flatMap(islandsIn(document.blocks), ({ name, attributes }) =>
    name === "Tokens" ? [attributes["prefix"] ?? ""] : []
  )
);

const tablesOf = (name: string): readonly string[] =>
  Array.filter(prefixesOnPages, (prefix) => isUnder(prefix, name));

const colourTableView = <Message>(_model: unknown, h: HtmlBuilder<Message>) =>
  tokensView(h)({ prefix: "--semantic-color-text-primary" });

describe("the token tables", () => {
  it("each list at least one semantic token", () => {
    expect(
      Array.filter(prefixesOnPages, (prefix) =>
        Array.isReadonlyArrayEmpty(semanticTokensUnder(prefix))
      )
    ).toStrictEqual([]);
  });

  it("list every semantic token, each in one table", () => {
    expect(
      Array.flatMap(SEMANTIC_TOKENS, ({ name }) =>
        tablesOf(name).length === 1 ? [] : [{ name, in: tablesOf(name) }]
      )
    ).toStrictEqual([]);
  });

  it("compute every semantic token to a value without an alias left in it", () => {
    expect(
      Array.filter(SEMANTIC_TOKENS, (token) =>
        JSON.stringify(computedValue(token)).includes("var(")
      )
    ).toStrictEqual([]);
  });

  it("show a colour in both palettes", () => {
    Scene.scene(
      { update: (model: unknown) => ({ model }), view: colourTableView },
      Scene.given({}),
      Scene.expect(Scene.text("paper #16150f")).toExist(),
      Scene.expect(Scene.text("plum #efecf3")).toExist()
    );
  });
});
