import type * as Markdown from "@foldkit/markdown";
import { Array } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { EXAMPLES_ON_DISK } from "./example.ts";
import { PAGES } from "./pages.ts";

const islandsIn = (
  blocks: readonly Markdown.Block[]
): readonly Markdown.Island[] =>
  Array.flatMap(blocks, (block) =>
    block._tag === "Island" ? [block, ...islandsIn(block.blocks)] : []
  );

const examplesOnPages = Array.flatMap(PAGES, ({ slug, document }) =>
  Array.flatMap(islandsIn(document.blocks), ({ name, attributes }) =>
    name === "Example" ? [`${slug}/${attributes["name"] ?? ""}`] : []
  )
);

describe("the component pages", () => {
  it("each have a title", () => {
    expect(
      Array.filter(PAGES, ({ title }) => title === "").map(({ slug }) => slug)
    ).toStrictEqual([]);
  });

  it("show only examples that exist", () => {
    expect(Array.difference(examplesOnPages, EXAMPLES_ON_DISK)).toStrictEqual(
      []
    );
  });

  it("show every example once", () => {
    expect(examplesOnPages.toSorted()).toStrictEqual(
      EXAMPLES_ON_DISK.toSorted()
    );
  });
});
