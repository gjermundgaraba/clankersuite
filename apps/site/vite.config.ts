import { markdown } from "@foldkit/markdown/vite";
import { foldkit, foldkitViewIdentity } from "@foldkit/vite-plugin";
import { schemeScript } from "@gjermundgaraba/components/scheme";
import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";

import { Frontmatter } from "./src/frontmatter.ts";
import { islandAttributes } from "./src/islands.ts";

const pinnedScheme: Plugin = {
  name: "site:pinned-scheme",
  transformIndexHtml: () => [
    { tag: "script", children: schemeScript, injectTo: "head-prepend" },
  ],
};

const browsers = ["chrome123", "firefox120", "safari17.5"];

const markdownPlugin = markdown({
  islands: islandAttributes,
  frontmatter: Frontmatter,
});

export default defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? [foldkitViewIdentity(), markdownPlugin]
      : [foldkit(), markdownPlugin, pinnedScheme],
  build: { outDir: "dist", emptyOutDir: true, cssTarget: browsers },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "happy-dom",
    css: true,
    setupFiles: ["test-setup.ts"],
    unstubGlobals: true,
    server: {
      deps: { inline: ["foldkit", "@foldkit/ui", "@foldkit/markdown"] },
    },
  },
}));
