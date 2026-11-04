import { describe, expect, it } from "vite-plus/test";

const SOURCES = import.meta.glob<string>(
  ["./**/*.ts", "!./**/*.test.ts", "!./**/examples/**", "!./test/**"],
  { eager: true, query: "?raw", import: "default" }
);

const THIRD_PARTY_ATTRIBUTE =
  /^data-(?:color-scheme|drag-over|sortable-id|draggable-id|droppable-id|foldkit-)/u;

const namesIn = (
  source: string,
  pattern: RegExp,
  group = "name"
): readonly string[] =>
  Array.from(source.matchAll(pattern), ({ groups }) => groups?.[group] ?? "");

const attributesIn = (source: string): readonly string[] => [
  ...namesIn(source, /(?<![\w-])(?<name>data-[a-z][-a-z]*)/gu),
  ...namesIn(source, /DataAttribute\(\s*"(?<name>[a-z][-a-z]*)"/gu).map(
    (name) => `data-${name}`
  ),
  ...namesIn(source, /_ATTRIBUTE = "(?<name>[a-z][-a-z]*)"/gu).map((name) =>
    name.startsWith("data-") ? name : `data-${name}`
  ),
];

const THIRD_PARTY_CLASS = /^(?:sr-only|cm-[\w-]+)$/u;

const classListsIn = (source: string): readonly string[] => [
  ...namesIn(
    source,
    /(?:\bClass\(|\bclass: |\.className = |\.classList\.(?:add|contains|remove|toggle)\()\s*"(?<name>[^"]*)"/gu
  ),
  ...namesIn(
    source,
    /"(?<name> ?(?:[a-z][-a-z\d]* )*gg-[-a-z\d]*(?: [a-z][-a-z\d]*)* ?)"/gu
  ),
];

describe("the components' classes", () => {
  it("are prefixed gg-, beside sr-only and CodeMirror's", () => {
    const offenders = Object.entries(SOURCES).flatMap(([path, source]) =>
      classListsIn(source).flatMap((list) =>
        list
          .split(/\s+/u)
          .filter((name) => name !== "")
          .flatMap((name) =>
            name.startsWith("gg-") || THIRD_PARTY_CLASS.test(name)
              ? []
              : [`${path}: ${name}`]
          )
      )
    );

    expect(offenders).toStrictEqual([]);
  });
});

const PAGES = import.meta.glob<string>(["./*/*.md", "../docs/*.md"], {
  eager: true,
  query: "?raw",
  import: "default",
});

const commentsIn = (source: string): string =>
  Array.from(
    source.matchAll(/\/\*[\s\S]*?\*\/|\/\/.*$/gmu),
    ([comment]) => comment
  ).join("\n");

const SELECTOR =
  /(?<![\w.$-])(?:a|article|aside|button|code|details|dialog|div|em|footer|form|h[1-6]|header|input|kbd|label|li|main|nav|ol|output|p|pre|section|span|strong|summary|table|td|textarea|th|tr|ul)(?<classes>(?:\.[a-z][-a-z\d]*)+)/gu;

const selectorClassesIn = (text: string): readonly string[] =>
  Array.from(text.matchAll(/`[^`\n]*`/gu), ([code]) => code).flatMap((code) =>
    namesIn(code, SELECTOR, "classes").flatMap((classes) =>
      classes.split(".").slice(1)
    )
  );

describe("the classes the docs name", () => {
  it("are prefixed gg-, in the pages and in the doc comments", () => {
    const texts = [
      ...Object.entries(PAGES),
      ...Object.entries(SOURCES).map(
        ([path, source]) => [path, commentsIn(source)] as const
      ),
    ];

    const offenders = texts.flatMap(([path, text]) =>
      selectorClassesIn(text).flatMap((name) =>
        name.startsWith("gg-") ? [] : [`${path}: ${name}`]
      )
    );

    expect(Object.keys(PAGES).length).toBeGreaterThan(80);
    expect(offenders).toStrictEqual([]);
  });
});

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
