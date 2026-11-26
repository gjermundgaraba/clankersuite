import { describe, expect, it } from "vite-plus/test";

import { LIVE_MARKDOWN_STYLE } from "./markdown-editor/live/theme.ts";

import TOKENS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";
import INTER from "@gjermundgaraba/fonts/inter.css?raw";

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

const STYLESHEETS = import.meta.glob<string>("./**/*.css", {
  eager: true,
  query: "?raw",
  import: "default",
});

const STYLESHEET = [
  ...Object.values(STYLESHEETS),
  asCss(LIVE_MARKDOWN_STYLE),
].join("\n");

describe("clankersuite.css", () => {
  it("imports every other stylesheet in the package, once", () => {
    const imported = Array.from(
      STYLESHEETS["./clankersuite.css"]?.matchAll(
        /@import "(?<path>\.\/[^"]+)";/gu
      ) ?? [],
      ({ groups }) => groups?.["path"] ?? ""
    );

    expect(imported.toSorted()).toStrictEqual(
      Object.keys(STYLESHEETS)
        .filter((path) => path !== "./clankersuite.css")
        .toSorted()
    );
  });
});

interface Declaration {
  readonly property: string;
  readonly value: string;
}

const TILE_GEOMETRY_PROPERTIES: ReadonlySet<string> = new Set([
  "background-position",
  "background-size",
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
    expect(declarations.length).toBeGreaterThan(1500);
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

  it("uses only semantic tokens, each one the token stylesheet defines", () => {
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

  it("names its own custom properties and anchors --gg-, beside the tokens", () => {
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

const ruleBodies = (selector: string): readonly string[] =>
  Array.from(
    withoutComments.matchAll(
      new RegExp(
        `(?<=^|[{};]\\s*)${RegExp.escape(selector)}\\s*\\{(?<body>[^{}]*)\\}`,
        "gu"
      )
    ),
    ({ groups }) => groups?.["body"] ?? ""
  );

const ruleBody = (selector: string): string => {
  const bodies = ruleBodies(selector);

  expect(bodies, selector).not.toStrictEqual([]);

  return bodies.join("\n");
};

describe("the stylesheet's rules", () => {
  it("edges the surface, card, menu and toast, which a shadow rings, with a transparent outline, the edge forced colours paint, taking no room", () => {
    for (const selector of [
      ".gg-surface",
      ".gg-card",
      ".gg-menu",
      ".gg-toast",
    ]) {
      expect(ruleBody(selector), selector).toContain(
        "outline: var(--semantic-dimension-border-width-default) solid transparent;"
      );
    }
  });

  it("rings a row's check with a border, not a shadow, so the ring survives forced colours", () => {
    const check = ruleBody(".gg-check");

    expect(check).toMatch(/\bborder:/u);
    expect(check).not.toContain("box-shadow");
  });

  it("writes out each selector of a selected row rather than joining them in :is(), so each keeps its own specificity", () => {
    expect(
      ruleBody(
        '.gg-row.gg-linked:has(.gg-grow a[aria-current]),\n.gg-board-card[aria-current="true"],\n.gg-row[aria-current="true"]'
      )
    ).toContain("background-color: var(--semantic-color-background-selected);");
  });

  it("takes an idle loading status out of the flow, never display: none, which would take its live region out of the accessibility tree", () => {
    expect(ruleBody(".gg-loading-idle")).toContain("position: absolute;");
    expect(ruleBody(".gg-loading-idle")).not.toContain("display");
  });

  it("hides a row's and a goal's tools from sight only, never display or visibility, so Tab still reaches them", () => {
    const rowTools = ruleBody(
      '.gg-row:not(:hover, :focus-within, [aria-current="true"]) > .gg-tools'
    );

    const goalActions = ruleBody(
      ".gg-goal-card:not(:hover, :focus-within) .gg-goal-head > .gg-card-acts"
    );

    expect(rowTools).toContain("clip-path: inset(50%);");
    expect(goalActions).toContain("opacity: 0;");

    for (const body of [rowTools, goalActions]) {
      expect(body).not.toMatch(/\b(?:display|visibility):/u);
    }
  });

  it("keeps the Markdown editor's 1px textarea unwrapped, or every keystroke's write lays out each word on a line of its own again", () => {
    expect(
      ruleBody("gg-markdown-editor:has(.gg-markdown-surface) textarea")
    ).toContain("white-space: pre;");
  });

  it("hides a visually hidden date input's picker button, whose name Chromium adds to the cell around it, aria-hidden or not", () => {
    expect(ruleBody(".sr-only::-webkit-calendar-picker-indicator")).toContain(
      "display: none;"
    );
  });

  it("rounds the nav strip's end items inside its border instead of clipping the strip, which would clip their focus rings", () => {
    expect(ruleBody(".gg-nav")).not.toContain("overflow");
    expect(ruleBody(".gg-nav > :first-child")).toContain(
      "border-start-start-radius"
    );
  });

  it("sets Inter's single-storey a and open digits on its face, so no font shorthand resets them and no other face takes them", () => {
    expect(INTER).toContain('font-feature-settings: "cv11", "ss01";');
    expect(declarations.map(({ property }) => property)).not.toContain(
      "font-feature-settings"
    );
  });
});
