import { Array, Predicate, Record, String } from "effect";

import { groupTokens, parseTokens, resolve } from "./token-css.ts";
import type { Section, Token } from "./token-css.ts";

import TOKENS_CSS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

export type { Token } from "./token-css.ts";

type TokenGroup = Readonly<{ name: string; tokens: readonly Token[] }>;

export type TokenSection = Readonly<{
  id: string;
  title: string;
  groups: readonly TokenGroup[];
  count: number;
}>;

const SECTIONS: readonly Section[] = [
  {
    heading: "colour: backgrounds",
    from: "--semantic-color-background-backdrop",
  },
  { heading: "colour: borders", from: "--semantic-color-border-divider" },
  {
    heading: "colour: focus rings",
    from: "--semantic-color-focus-ring-default",
  },
  { heading: "colour: shadows", from: "--semantic-color-shadow-default" },
  { heading: "colour: text", from: "--semantic-color-text-code-comment" },
  { heading: "lines", from: "--semantic-dimension-border-width-container" },
  {
    heading: "type: the working and reading scales",
    from: "--semantic-dimension-font-size-body",
  },
  {
    heading: "type: tracking",
    from: "--semantic-dimension-letter-spacing-caps",
  },
  { heading: "space: sizes", from: "--semantic-dimension-size-max-width-deck" },
  {
    heading: "space: padding and gaps",
    from: "--semantic-dimension-space-gap-body",
  },
  { heading: "motion: stepped or instant", from: "--semantic-duration-blink" },
  { heading: "type: three families", from: "--semantic-font-family-body" },
  { heading: "type: weights", from: "--semantic-font-weight-prose-heading" },
  {
    heading: "colour: fades",
    from: "--semantic-number-opacity-disabled-on-inverse-fill",
  },
  {
    heading: "print shadows: zero blur, offset down and right",
    from: "--semantic-shadow-button-default",
  },
];

const ALL_TOKENS = parseTokens(TOKENS_CSS);

const SEMANTIC_TOKENS = ALL_TOKENS.filter(({ name }) =>
  name.startsWith("--semantic-")
);

const GROUPS = groupTokens(SEMANTIC_TOKENS, SECTIONS);

const capitalise = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

export const tokenSections = (): readonly TokenSection[] => {
  const named = Array.map(GROUPS, ({ heading, tokens }) => {
    const [kind, ...name] = String.split(heading, ": ");

    return { kind, group: { name: Array.join(name, ": "), tokens } };
  });

  const byKind = Array.groupBy(named, ({ kind }) => kind);

  return Array.map(Record.toEntries(byKind), ([kind, kindGroups]) => ({
    id: kind.replaceAll(/\W+/gu, "-"),
    title: capitalise(kind),
    groups: Array.map(kindGroups, ({ group }) => group),
    count: Array.reduce(
      kindGroups,
      0,
      (total, { group }) => total + group.tokens.length
    ),
  }));
};

export type Kind =
  | "Colour"
  | "Image"
  | "Shadow"
  | "Font"
  | "Size"
  | "Tracking"
  | "Weight"
  | "Length"
  | "Value";

export const kindOf = (token: Token): Kind => {
  const resolved = resolve(ALL_TOKENS, token.value);
  const { name } = token;

  if (!Predicate.isString(resolved)) {
    return "Colour";
  } else if (name.startsWith("--semantic-font-family-")) {
    return "Font";
  } else if (name.startsWith("--semantic-shadow-")) {
    return "Shadow";
  } else if (name.startsWith("--semantic-dimension-letter-spacing-")) {
    return "Tracking";
  } else if (name.startsWith("--semantic-font-weight-")) {
    return "Weight";
  } else if (resolved.startsWith("conic-gradient(")) {
    return "Image";
  } else if (/^(?:#|rgba?\(|light-dark\()/u.test(resolved)) {
    return "Colour";
  } else if (
    name.startsWith("--semantic-dimension-font-size-") &&
    resolved.endsWith("px")
  ) {
    return "Size";
  } else if (/^\d+(?:\.\d+)?(?:px|ch)$/u.test(resolved)) {
    return "Length";
  }

  return "Value";
};

export type Palette = "paper" | "plum";

export const resolveColour = (value: string, palette: Palette): string => {
  const resolved = resolve(ALL_TOKENS, value);

  if (Predicate.isString(resolved)) {
    return resolved;
  }

  return palette === "paper" ? resolved.light : resolved.dark;
};
