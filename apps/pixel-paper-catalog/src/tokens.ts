import { Array, Predicate, Record, String } from "effect";

import { groupTokens, parseTokens, resolve } from "./token-css.ts";
import type { Section, Token } from "./token-css.ts";

import TOKENS_CSS from "@gjermundgaraba/pixel-paper/tokens.css?raw";

export type { Token } from "./token-css.ts";

type TokenGroup = Readonly<{ name: string; tokens: readonly Token[] }>;

export type TokenSection = Readonly<{
  id: string;
  title: string;
  groups: readonly TokenGroup[];
  count: number;
}>;

const SECTIONS: readonly Section[] = [
  { heading: "colour: neutrals", from: "--ink" },
  { heading: "colour: the three meanings", from: "--amber" },
  { heading: "colour: text on fills", from: "--on-status" },
  {
    heading: "colour: content, inside code and terminals only",
    from: "--term-black",
  },
  { heading: "colour: print and veil", from: "--shadow-color" },
  { heading: "colour: fades", from: "--fade-on-ink" },
  { heading: "type: three families", from: "--font-px" },
  { heading: "type: the working scale", from: "--type-label" },
  {
    heading: "type: the reading scale (authored pages only)",
    from: "--read-body",
  },
  { heading: "lines", from: "--line" },
  { heading: "space", from: "--row" },
  {
    heading: "space: between components (Stack, Group, Wrap)",
    from: "--space-s",
  },
  { heading: "type: figures", from: "--type-figure" },
  {
    heading: "print shadows: zero blur, offset down and right",
    from: "--shadow-card",
  },
  {
    heading: "the reel: a scrolling row of columns of panes",
    from: "--reel-gutter",
  },
  {
    heading: "the bench: a page whose work is the window",
    from: "--bench-work-min",
  },
  { heading: "charts", from: "--chart-plot" },
  { heading: "motion: stepped or instant", from: "--motion-flash" },
  { heading: "motion: how long a toast stays", from: "--toast-hold" },
];

const ALL_TOKENS = parseTokens(TOKENS_CSS);

const GROUPS = groupTokens(ALL_TOKENS, SECTIONS);

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
  } else if (name.startsWith("--font-")) {
    return "Font";
  } else if (name.startsWith("--shadow-") && !name.endsWith("-color")) {
    return "Shadow";
  } else if (name.startsWith("--tracking-")) {
    return "Tracking";
  } else if (name.endsWith("-weight")) {
    return "Weight";
  } else if (resolved.startsWith("conic-gradient(")) {
    return "Image";
  } else if (/^(?:#|rgba?\(|light-dark\()/u.test(resolved)) {
    return "Colour";
  } else if (/^--(?:type|read)-/u.test(name) && resolved.endsWith("px")) {
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
