import { brandDistDirectory, foldkitViewIdentity } from "@foldkit/vite-plugin";
import { defineConfig } from "vite-plus";

import manifest from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [foldkitViewIdentity()],
  pack: {
    entry: [
      "src/index.ts",
      "src/scheme/script.ts",
      "src/markdown-editor/element.ts",
    ],
    platform: "browser",
    unbundle: true,
    dts: { generator: "tsgo" },
    hooks: {
      "build:done": () => {
        brandDistDirectory(import.meta.dirname, manifest.name);
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "happy-dom",
    css: true,
    setupFiles: ["src/test/setup.ts"],
    unstubGlobals: true,
    server: { deps: { inline: ["foldkit", "@foldkit/ui"] } },
  },
});
