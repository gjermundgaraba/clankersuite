import type { Option } from "effect";
import { Array, Predicate, Record } from "effect";

import { parseTokens, resolve, tokensUnder } from "./token-css.ts";
import type { Schemes, Token } from "./token-css.ts";

import BRAND_CSS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

const ALL_TOKENS = parseTokens(BRAND_CSS);

/** The brand's semantic tokens, in the order its stylesheet declares them. */
export const SEMANTIC_TOKENS: readonly Token[] = Array.filter(
  ALL_TOKENS,
  ({ name }) => name.startsWith("--semantic-")
);

/** The semantic tokens `prefix` names, as a `::Tokens` island lists them. */
export const semanticTokensUnder = (prefix: string): readonly Token[] =>
  tokensUnder(SEMANTIC_TOKENS, prefix);

/** What a token is computed to, on the page: one value, or one in each palette. */
export const computedValue = (token: Token): string | Schemes =>
  resolve(ALL_TOKENS, token.value);

/** The semantic token a token aliases, when it aliases one rather than a primitive. */
export const semanticAlias = (token: Token): string | undefined => {
  const alias = /^var\((?<name>--semantic-[\w-]+)\)$/u.exec(token.value)
    ?.groups?.["name"];

  return alias;
};

/** How a token's row shows it. */
export type Kind =
  | "Colour"
  | "Shadow"
  | "Font"
  | "Size"
  | "Tracking"
  | "Weight"
  | "Length"
  | "Value";

const LENGTH = /^\d+(?:\.\d+)?(?:px|ch)$/u;

export const kindOf = (token: Token): Kind => {
  const computed = computedValue(token);
  const { name } = token;

  if (name.startsWith("--semantic-color-")) {
    return "Colour";
  } else if (name.startsWith("--semantic-shadow-")) {
    return "Shadow";
  } else if (name.startsWith("--semantic-font-family-")) {
    return "Font";
  } else if (name.startsWith("--semantic-font-weight-")) {
    return "Weight";
  } else if (name.startsWith("--semantic-dimension-letter-spacing-")) {
    return "Tracking";
  } else if (name.startsWith("--semantic-dimension-font-size-")) {
    return "Size";
  } else if (Predicate.isString(computed) && LENGTH.test(computed)) {
    return "Length";
  }

  return "Value";
};

/** The two palettes of the brand, by the colour scheme each is. */
export type Palette = Readonly<{ name: string; scheme: keyof Schemes }>;

export const PALETTES: readonly Palette[] = [
  { name: "paper", scheme: "light" },
  { name: "plum", scheme: "dark" },
];

const SOURCES = import.meta.glob<unknown>(
  "../../../packages/design-tokens/tokens/shared/semantic/**/*.tokens.json",
  { eager: true, import: "default" }
);

const cssSegment = (key: string): string =>
  key
    .replaceAll(/(?<=[a-z\d])(?=[A-Z])|(?<=[a-zA-Z])(?=\d)/gu, "-")
    .toLowerCase();

const descriptionsIn = (
  node: unknown,
  path: readonly string[]
): ReadonlyArray<readonly [string, string]> =>
  Predicate.isReadonlyObject(node)
    ? [
        ...("$value" in node && Predicate.isString(node["$description"])
          ? [
              [
                `--${Array.join(Array.map(path, cssSegment), "-")}`,
                node["$description"],
              ] as const,
            ]
          : []),
        ...Object.entries(node).flatMap(([key, child]) =>
          key.startsWith("$") ? [] : descriptionsIn(child, [...path, key])
        ),
      ]
    : [];

const DESCRIPTIONS: Readonly<Record<string, string>> = Record.fromEntries(
  Object.values(SOURCES).flatMap((source) => descriptionsIn(source, []))
);

/** What a semantic token is for, as its DTCG source describes it. */
export const descriptionOf = (token: Token): Option.Option<string> =>
  Record.get(DESCRIPTIONS, token.name);
