import { describe, expect, it } from "vite-plus/test";

const SOURCES = import.meta.glob<string>(
  ["./**/*.ts", "!./**/*.test.ts", "!./**/examples/**", "!./test/**"],
  { eager: true, query: "?raw", import: "default" }
);

const THIRD_PARTY_ATTRIBUTE =
  /^data-(?:color-scheme|drag-over|sortable-id|draggable-id|droppable-id|foldkit-)/u;

const namesIn = (source: string, pattern: RegExp): readonly string[] =>
  Array.from(source.matchAll(pattern), ({ groups }) => groups?.["name"] ?? "");

const attributesIn = (source: string): readonly string[] => [
  ...namesIn(source, /(?<![\w-])(?<name>data-[a-z][-a-z]*)/gu),
  ...namesIn(source, /DataAttribute\(\s*"(?<name>[a-z][-a-z]*)"/gu).map(
    (name) => `data-${name}`
  ),
  ...namesIn(source, /_ATTRIBUTE = "(?<name>[a-z][-a-z]*)"/gu).map((name) =>
    name.startsWith("data-") ? name : `data-${name}`
  ),
];

describe("the components' attributes", () => {
  it("are prefixed data-gg-, beside the scheme's and @foldkit/ui's", () => {
    const offenders = Object.entries(SOURCES).flatMap(([path, source]) =>
      attributesIn(source).flatMap((name) =>
        name.startsWith("data-gg-") || THIRD_PARTY_ATTRIBUTE.test(name)
          ? []
          : [`${path}: ${name}`]
      )
    );

    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
    expect(offenders).toStrictEqual([]);
  });
});
