import { config } from "@clanker-stuff/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: config(),
  run: {
    cache: true,
  },
});
