import { Predicate } from "effect";

export type Token = Readonly<{
  name: string;
  value: string;
}>;

const valueEnd = (css: string, start: number, name: string): number => {
  const unreadable = (what: string) =>
    new Error(`Cannot read the token ${name}: ${what}.`);

  let depth = 0;

  for (let index = start; index < css.length; index += 1) {
    const character = css[index];

    if (character === "\\") {
      index += 1;
    } else if (character === "'" || character === '"') {
      for (
        index += 1;
        index < css.length && css[index] !== character;
        index += 1
      ) {
        if (css[index] === "\\") {
          index += 1;
        }
      }

      if (index >= css.length) {
        throw unreadable("a quote is never closed");
      }
    } else if (css.startsWith("/*", index)) {
      const close = css.indexOf("*/", index + 2);

      if (close === -1) {
        throw unreadable("a comment is never closed");
      }

      index = close + 1;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      if (depth === 0) {
        throw unreadable("a parenthesis closes that never opened");
      }

      depth -= 1;
    } else if (depth === 0 && (character === ";" || character === "}")) {
      return index;
    } else if (depth === 0 && character === "{") {
      throw unreadable("its value holds a brace");
    }
  }

  throw unreadable(
    depth > 0 ? "a parenthesis is never closed" : "it has no end"
  );
};

const SPACING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\(\s+|\s+\)|\s+/gsu;

const oneLine = (value: string): string =>
  value.replaceAll(SPACING, (match) => {
    if (match.startsWith('"') || match.startsWith("'")) {
      return match;
    }

    if (match.startsWith("(")) {
      return "(";
    }

    return match.endsWith(")") ? ")" : " ";
  });

export const parseTokens = (css: string): readonly Token[] => {
  const tokens = new Map<string, Token>();

  const start =
    /\/\*[\s\S]*?\*\/|[{;](?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?<name>--[\w-]+)\s*:/gu;

  for (let match = start.exec(css); match !== null; match = start.exec(css)) {
    const name = match.groups?.["name"];

    if (name === undefined) {
      continue;
    }

    const end = valueEnd(css, start.lastIndex, name);
    const value = css.slice(start.lastIndex, end);
    start.lastIndex = end;

    if (!tokens.has(name)) {
      tokens.set(name, { name, value: oneLine(value.trim()) });
    }
  }

  return [...tokens.values()];
};

export type Section = Readonly<{ heading: string; from: string }>;

export const groupTokens = (
  tokens: readonly Token[],
  sections: readonly Section[]
): ReadonlyArray<Readonly<{ heading: string; tokens: readonly Token[] }>> => {
  const starts: number[] = [];

  for (const { heading, from } of sections) {
    const at = tokens.findIndex((token) => token.name === from);

    if (at === -1) {
      throw new Error(
        `The section ${heading} starts at ${from}, which is not declared.`
      );
    }

    if (at <= (starts.at(-1) ?? -1)) {
      throw new Error(
        `The section ${heading} starts at ${from}, which is not after the section before it.`
      );
    }

    starts.push(at);
  }

  const [first] = tokens;

  if (first !== undefined && starts[0] !== 0) {
    throw new Error(
      `The token ${first.name} is declared before every section.`
    );
  }

  return sections.map(({ heading }, index) => ({
    heading,
    tokens: tokens.slice(starts[index], starts[index + 1]),
  }));
};

export type Schemes = Readonly<{ light: string; dark: string }>;

const ALIAS = /^var\((?<name>--[\w-]+)\)$/u;
const LIGHT_DARK = /^light-dark\((?<list>.*)\)$/u;

const topLevelArguments = (list: string): readonly string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < list.length; index += 1) {
    const character = list[index];

    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;
    }

    if (character === "," && depth === 0) {
      parts.push(list.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(list.slice(start).trim());

  return parts;
};

export const resolve = (
  tokens: readonly Token[],
  value: string
): string | Schemes => {
  const alias = ALIAS.exec(value)?.groups?.["name"];

  if (alias !== undefined) {
    const target = tokens.find((token) => token.name === alias);

    return target === undefined ? value : resolve(tokens, target.value);
  }

  const list = LIGHT_DARK.exec(value)?.groups?.["list"];

  if (list === undefined) {
    return value;
  }

  const [light = value, dark = light] = topLevelArguments(list);
  const sides = [resolve(tokens, light), resolve(tokens, dark)];

  const side = (resolved: string | Schemes, scheme: keyof Schemes) =>
    Predicate.isString(resolved) ? resolved : resolved[scheme];

  return {
    light: side(sides[0] ?? light, "light"),
    dark: side(sides[1] ?? dark, "dark"),
  };
};
