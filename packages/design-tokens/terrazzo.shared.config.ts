import path from "node:path";

import { defineConfig } from "@terrazzo/cli";
import type { Plugin, TokenNormalized } from "@terrazzo/parser";
import css from "@terrazzo/plugin-css";

const SEMANTIC_COLOR = "semantic.color.";

const SCHEME_RULES = `:root[data-scheme="light"] {
  color-scheme: light;
}

:root[data-scheme="dark"] {
  color-scheme: dark;
}`;

const indent = (contents: string): string =>
  contents
    .split("\n")
    .map((line) => (line === "" ? line : `  ${line.trimStart()}`))
    .join("\n");

const directAlias = (
  token: TokenNormalized | undefined,
  scheme: string
): string => {
  const [alias] = token?.aliasChain ?? [];

  if (alias === undefined) {
    throw new Error(
      `${token?.id ?? "A semantic colour"} must alias another token in the ${scheme} scheme, not hold a literal.`
    );
  }

  return alias;
};

const lightDarkCss = (filename: string): Plugin => {
  let darkTokens: Readonly<Record<string, TokenNormalized>> = {};

  const inner = css({
    filename,
    legacyHex: true,
    permutations: [
      {
        input: {},
        prepare: (contents) =>
          `:root {\n  color-scheme: light dark;\n${indent(contents)}\n}\n\n${SCHEME_RULES}`,
        transform: (token, { tokensSet, transformAlias }) => {
          if (!token.id.startsWith(SEMANTIC_COLOR)) {
            return undefined;
          }

          const variable = (id: string): string => {
            const target = tokensSet[id];

            if (target === undefined) {
              throw new Error(
                `${token.id} aliases ${id}, which does not exist.`
              );
            }

            if (transformAlias === undefined) {
              throw new Error("The CSS plugin passed no alias transform.");
            }

            return transformAlias(target);
          };

          const light = directAlias(token, "light");
          const dark = directAlias(darkTokens[token.id], "dark");

          return light === dark
            ? variable(light)
            : `light-dark(${variable(light)}, ${variable(dark)})`;
        },
      },
    ],
  });

  return {
    ...inner,
    transform: async (options) => {
      darkTokens = options.resolver.apply({ colorScheme: "dark" });
      await inner.transform?.(options);
    },
  };
};

/**
 * The Terrazzo build for one brand: `tokens/<brand>.resolver.json` to
 * `generated/<brand>.css`. Semantic colours print as `light-dark(light, dark)`, so they follow
 * the `color-scheme` of the element that uses them: the reader's preference by default,
 * `data-scheme` on `<html>` to pin one, or `color-scheme` on any element below it.
 */
export const brandConfig = (brand: string) =>
  defineConfig({
    tokens: [path.join(import.meta.dirname, `tokens/${brand}.resolver.json`)],
    outDir: "./generated/",
    plugins: [lightDarkCss(`${brand}.css`)],
    lint: {
      rules: {
        "core/consistent-naming": ["error", { format: "camelCase" }],
        "core/valid-dimension": [
          "error",
          { allowedUnits: ["px", "em", "rem", "ch"] },
        ],
      },
    },
  });
