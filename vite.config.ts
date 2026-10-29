import ultracite from "ultracite/oxfmt";
import { defineConfig } from "vite-plus";

import lint, { ignorePatterns } from "./oxlint.config.ts";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ...ultracite,
    ignorePatterns: [...(ultracite.ignorePatterns ?? []), ...ignorePatterns],
    overrides: [
      {
        files: ["**/*.md"],
        options: { embeddedLanguageFormatting: "off", proseWrap: "preserve" },
      },
    ],
  },
  lint,
  run: {
    cache: true,
  },
});
