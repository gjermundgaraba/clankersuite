import { describe, expect, it } from "vite-plus/test";

import { LIVE_MARKDOWN_STYLE } from "./markdown-editor/live/theme.ts";

import COMPONENTS_CSS from "./components.css?raw";
import TOKENS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

const kebabCase = (property: string) =>
  property.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

const asCss = (
  style: Readonly<Record<string, Readonly<Record<string, string>>>>
) =>
  Object.entries(style)
    .map(
      ([selector, declarations]) =>
        `${selector} {${Object.entries(declarations)
          .map(([property, value]) => ` ${kebabCase(property)}: ${value};`)
          .join("")} }`
    )
    .join("\n");

const STYLESHEET = `${COMPONENTS_CSS}\n${asCss(LIVE_MARKDOWN_STYLE)}`;

interface Declaration {
  readonly property: string;
  readonly value: string;
}

const TILE_GEOMETRY_PROPERTIES: ReadonlySet<string> = new Set([
  "background-position",
  "background-size",
  "--gg-dither",
  "--gg-veil-grain",
]);

const TOKENED_UNITLESS_PROPERTIES: ReadonlySet<string> = new Set([
  "font",
  "font-weight",
  "line-height",
  "opacity",
  "scale",
  "z-index",
]);

const OPACITY_KEYWORDS: ReadonlySet<number> = new Set([0, 1]);

const ABSOLUTE_QUANTITY =
  /(?<![\w.#-])(?<number>(?:\d*\.)?\d+)(?:px|rem|ch|ms|s)(?![\w-])/gu;

const UNITLESS_NUMBER = /(?<![\w.#-])(?<number>(?:\d*\.)?\d+)(?![\w.%-])/gu;

const SCALE_ARGUMENT = /\bscale(?:X|Y|Z|3d)?\((?<arguments>[^)]*)\)/gu;

const COLOR_LITERAL =
  /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|\b(?:white|black|red|green|blue|yellow|orange|purple|gray|grey|silver|maroon|fuchsia|lime|olive|navy|teal|aqua)\b/iu;

const declarations: readonly Declaration[] = Array.from(
  STYLESHEET.replaceAll(/\/\*[\s\S]*?\*\//gu, "").matchAll(
    /(?<property>-{0,2}[a-z][-a-z]*)\s*:\s*(?<value>[^;{}]+);/gu
  ),
  ({ groups }) => ({
    property: groups?.["property"] ?? "",
    value: (groups?.["value"] ?? "").replaceAll(/\s+/gu, " ").trim(),
  })
);

const withoutPropertyNames = (value: string) =>
  value.replaceAll(/var\(\s*--[-\w]+\s*,?/gu, "(");

const numbersIn = (pattern: RegExp, value: string) =>
  Array.from(value.matchAll(pattern), ({ groups }) =>
    Number(groups?.["number"])
  ).filter((number) => number !== 0);

const offenders = (
  isOffending: (declaration: Declaration) => boolean
): readonly string[] =>
  declarations.flatMap((declaration) =>
    isOffending(declaration)
      ? [`${declaration.property}: ${declaration.value}`]
      : []
  );

describe("the stylesheet's values", () => {
  it("reads enough declarations to mean something", () => {
    expect(declarations.length).toBeGreaterThan(2000);
  });

  it("writes lengths and durations as tokens; zero, relative units, tile geometry and query thresholds, which var() can't reach, stay raw", () => {
    expect(
      offenders(
        ({ property, value }) =>
          !TILE_GEOMETRY_PROPERTIES.has(property) &&
          numbersIn(ABSOLUTE_QUANTITY, withoutPropertyNames(value)).length > 0
      )
    ).toStrictEqual([]);
  });

  it("writes colours as tokens", () => {
    expect(
      offenders(({ value }) => COLOR_LITERAL.test(withoutPropertyNames(value)))
    ).toStrictEqual([]);
  });

  it("writes weights, line heights, layers, opacities and scales as tokens; an opacity of 0 or 1 stays raw", () => {
    expect(
      offenders(({ property, value }) => {
        const bare = withoutPropertyNames(value);

        const scaleArguments = Array.from(
          bare.matchAll(SCALE_ARGUMENT),
          ({ groups }) => groups?.["arguments"] ?? ""
        ).join(" ");

        const numbers = [
          ...(TOKENED_UNITLESS_PROPERTIES.has(property)
            ? numbersIn(UNITLESS_NUMBER, bare)
            : []),
          ...numbersIn(UNITLESS_NUMBER, scaleArguments),
        ];

        return property === "opacity"
          ? numbers.some((number) => !OPACITY_KEYWORDS.has(number))
          : numbers.length > 0;
      })
    ).toStrictEqual([]);
  });

  it("uses only semantic tokens, each one the brand stylesheet defines", () => {
    const defined = new Set(
      Array.from(
        TOKENS.matchAll(/(?<name>--semantic-[-\w]+):/gu),
        ({ groups }) => groups?.["name"]
      )
    );

    const used = new Set(
      Array.from(
        STYLESHEET.matchAll(
          /var\(\s*(?<name>--(?:semantic|primitive)-[-\w]+)/gu
        ),
        ({ groups }) => groups?.["name"] ?? ""
      )
    );

    expect([...used].filter((name) => !defined.has(name))).toStrictEqual([]);
  });
});

const THIRD_PARTY_CLASS = /^(?:cm-|tok-|sr-only$)/u;

describe("the stylesheet's selectors", () => {
  it("styles only classes prefixed gg-, beside CodeMirror's cm-, the highlighter's tok- and @foldkit/ui's sr-only", () => {
    const selectors = Array.from(
      STYLESHEET.replaceAll(/\/\*[\s\S]*?\*\//gu, "")
        .replaceAll(/"[^"]*"|'[^']*'/gu, '""')
        .matchAll(/(?<=^|[{};])\s*(?<selector>[^@{};\s][^{};]*)\{/gu),
      ({ groups }) => groups?.["selector"] ?? ""
    );

    const classes = new Set(
      selectors.flatMap((selector) =>
        Array.from(
          selector.matchAll(/\.(?<name>-?[A-Za-z_][\w-]*)/gu),
          ({ groups }) => groups?.["name"] ?? ""
        )
      )
    );

    expect(classes.size).toBeGreaterThan(200);
    expect(
      [...classes].filter(
        (name) => !name.startsWith("gg-") && !THIRD_PARTY_CLASS.test(name)
      )
    ).toStrictEqual([]);
  });
});

const THIRD_PARTY_ATTRIBUTE = /^data-(?:drag-over|foldkit-)/u;

const withoutComments = STYLESHEET.replaceAll(/\/\*[\s\S]*?\*\//gu, "");

const namesIn = (pattern: RegExp): readonly string[] => [
  ...new Set(
    Array.from(
      withoutComments.matchAll(pattern),
      ({ groups }) => groups?.["name"] ?? ""
    )
  ),
];

describe("the stylesheet's other names", () => {
  it("selects only attributes prefixed data-gg-, beside @foldkit/ui's", () => {
    const attributes = namesIn(/\[(?<name>data-[-\w]+)/gu);

    expect(attributes.length).toBeGreaterThan(5);
    expect(
      attributes.filter(
        (name) =>
          !name.startsWith("data-gg-") && !THIRD_PARTY_ATTRIBUTE.test(name)
      )
    ).toStrictEqual([]);
  });

  it("names its own custom properties and anchors --gg-, beside the brand's tokens", () => {
    const names = namesIn(/(?<![\w-])(?<name>--[a-zA-Z][-\w]*)/gu);

    expect(names.length).toBeGreaterThan(100);
    expect(
      names.filter((name) => !/^--(?:gg|semantic|primitive)-/u.test(name))
    ).toStrictEqual([]);
  });

  it("names its keyframes gg-", () => {
    const keyframes = namesIn(/@keyframes\s+(?<name>[-\w]+)/gu);

    expect(keyframes.length).toBeGreaterThan(3);
    expect(keyframes.filter((name) => !name.startsWith("gg-"))).toStrictEqual(
      []
    );
  });
});
