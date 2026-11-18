import path from "node:path";

import { defineConfig } from "@terrazzo/cli";
import type { Plugin, TokenNormalized } from "@terrazzo/parser";
import css from "@terrazzo/plugin-css";

const SEMANTIC_COLOR = "semantic.color.";

const SCHEME_RULES = `:root[data-color-scheme="light"] {
  color-scheme: light;
}

:root[data-color-scheme="dark"] {
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

const lightDarkCss = (): Plugin => {
  let darkTokens: Readonly<Record<string, TokenNormalized>> = {};

  const inner = css({
    filename: "clankersuite.css",
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

export default defineConfig({
  tokens: [path.join(import.meta.dirname, "tokens/resolver.json")],
  outDir: "./generated/",
  plugins: [lightDarkCss()],
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
