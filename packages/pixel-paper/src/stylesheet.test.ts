import { describe, expect, it } from "vite-plus/test";

import STYLESHEET from "./pixel-paper.css?raw";
import TOKENS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

interface Declaration {
  readonly property: string;
  readonly value: string;
}

const TILE_GEOMETRY_PROPERTIES: ReadonlySet<string> = new Set([
  "background-position",
  "background-size",
  "--dither",
  "--veil-grain",
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
  STYLESHEET.replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .replaceAll(/@font-face\s*\{[^}]*\}/gu, "")
    .matchAll(/(?<property>-{0,2}[a-z][-a-z]*)\s*:\s*(?<value>[^;{}]+);/gu),
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
