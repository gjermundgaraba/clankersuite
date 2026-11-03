import { Array } from "effect";

/** A custom property as the stylesheet declares it: its first declaration. */
export type Token = Readonly<{
  name: string;
  value: string;
}>;

const DECLARATION = /^\s*(?<name>--[\w-]+):\s*(?<value>.*?);\s*$/u;

/** Every custom property the brand stylesheet declares, once, in source order, with the
 *  value of its first declaration. Terrazzo writes one declaration a line; a line that
 *  starts a custom property any other way throws, so a change in its output can't drop a
 *  token unseen. */
export const parseTokens = (css: string): readonly Token[] => {
  const tokens = new Map<string, Token>();

  for (const line of css.split("\n")) {
    if (line.trimStart().startsWith("--")) {
      const groups = DECLARATION.exec(line)?.groups;
      const name = groups?.["name"];
      const value = groups?.["value"];

      if (name === undefined || value === undefined) {
        throw new Error(
          `Cannot read the token on the line "${line.trim()}": Terrazzo writes one declaration a line.`
        );
      }

      if (!tokens.has(name)) {
        tokens.set(name, { name, value });
      }
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
