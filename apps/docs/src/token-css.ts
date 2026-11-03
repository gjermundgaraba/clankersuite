import { Array } from "effect";

/** A custom property as the stylesheet declares it: its first declaration, on one line. */
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

/** Every custom property the stylesheet declares, once, in source order, with the value of
 *  its first declaration as written. */
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

/** Whether `prefix` names the token or a group it is in: `--semantic-color-text` holds
 *  `--semantic-color-text-primary`, not `--semantic-color-textured`. */
export const isUnder = (prefix: string, name: string): boolean =>
  name === prefix || name.startsWith(`${prefix}-`);

/** The tokens `prefix` names, in source order. */
export const tokensUnder = (
  tokens: readonly Token[],
  prefix: string
): readonly Token[] =>
  Array.filter(tokens, ({ name }) => isUnder(prefix, name));

/** A value in each colour scheme, where `light-dark()` makes them differ. */
export type Schemes = Readonly<{ light: string; dark: string }>;

const VARIABLE = /var\((?<name>--[\w-]+)\)/gu;

const LIGHT_DARK = "light-dark(";

const closingParenthesis = (value: string, open: number): number => {
  let depth = 0;

  for (let index = open; index < value.length; index += 1) {
    if (value[index] === "(") {
      depth += 1;
    }

    if (value[index] === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return value.length;
};

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

const inScheme = (value: string, scheme: keyof Schemes): string => {
  const at = value.indexOf(LIGHT_DARK);

  if (at === -1) {
    return value;
  }

  const open = at + LIGHT_DARK.length - 1;
  const close = closingParenthesis(value, open);

  const [light = "", dark = light] = topLevelArguments(
    value.slice(open + 1, close)
  );

  return `${value.slice(0, at)}${inScheme(scheme === "light" ? light : dark, scheme)}${inScheme(value.slice(close + 1), scheme)}`;
};

const substitute = (
  byName: ReadonlyMap<string, string>,
  value: string,
  seen: ReadonlySet<string>
): string =>
  value.replaceAll(VARIABLE, (whole, name: string) => {
    const target = byName.get(name);

    return target === undefined || seen.has(name)
      ? whole
      : substitute(byName, target, new Set([...seen, name]));
  });

/** What `value` computes to: every `var()` of a declared token replaced by what that token
 *  computes to, and, where `light-dark()` makes the schemes differ, a value for each. A
 *  `var()` of a token the stylesheet does not declare stays as written. */
export const resolve = (
  tokens: readonly Token[],
  value: string
): string | Schemes => {
  const byName = new Map(Array.map(tokens, ({ name, value: v }) => [name, v]));
  const substituted = substitute(byName, value, new Set());

  if (!substituted.includes(LIGHT_DARK)) {
    return substituted;
  }

  return {
    light: inScheme(substituted, "light"),
    dark: inScheme(substituted, "dark"),
  };
};
