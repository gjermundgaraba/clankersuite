import type * as Markdown from "@foldkit/markdown";
import { Array, Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { EXAMPLES_ON_DISK, examplePath } from "./example.ts";
import { COMPONENT_PAGES, PAGES } from "./pages.ts";

const islandsIn = (
  blocks: readonly Markdown.Block[]
): readonly Markdown.Island[] =>
  Array.flatMap(blocks, (block) =>
    block._tag === "Island" ? [block, ...islandsIn(block.blocks)] : []
  );

const examplesOnPages = Array.flatMap(PAGES, ({ directory, document }) =>
  Array.flatMap(islandsIn(document.blocks), ({ name, attributes }) =>
    name === "Example" ? [examplePath(directory, attributes["name"] ?? "")] : []
  )
);

describe("the pages", () => {
  it("each have a title", () => {
    expect(
      Array.flatMap(PAGES, ({ href, title }) => (title === "" ? [href] : []))
    ).toStrictEqual([]);
  });

  it("each have their own address", () => {
    const hrefs = Array.map(PAGES, ({ href }) => href);

    expect(Array.dedupe(hrefs)).toStrictEqual(hrefs);
  });

  it("place every component in a category", () => {
    expect(
      Array.flatMap(COMPONENT_PAGES, ({ href, placement }) =>
        placement._tag === "Component" && Option.isNone(placement.category)
          ? [href]
          : []
      )
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
