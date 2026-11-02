import { copyFile } from "node:fs/promises";
import path from "node:path";

import { foldkit, foldkitViewIdentity } from "@foldkit/vite-plugin";
import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";

const browsers = ["chrome123", "firefox120", "safari17.5"];

const notFoundPage: Plugin = {
  name: "catalog:404",
  buildApp: {
    order: "post",
    handler: async () => {
      await copyFile(
        path.resolve(import.meta.dirname, "dist", "404", "index.html"),
        path.resolve(import.meta.dirname, "dist", "404.html")
      );
    },
  },
};

export default defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? [foldkitViewIdentity()]
      : [
          foldkit({
            ssr: {
              serverEntry: "/src/entry.server.ts",
              clientEntry: "/src/entry.ts",
              build: {
                prerender: true,
                clientOutDir: "dist",
                serverOutDir: "dist-ssr",
              },
            },
          }),
          notFoundPage,
        ],
  optimizeDeps: { entries: ["src/entry.ts"] },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssTarget: browsers,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "happy-dom",
    css: true,
    setupFiles: ["test-setup.ts"],
    unstubGlobals: true,
    server: { deps: { inline: ["foldkit", "@foldkit/ui"] } },
  },
  run: {
    tasks: {
      "install-browser": {
        command: "playwright install --with-deps chromium",
        cache: false,
      },
      smoke: {
        command: "node smoke.ts",
        dependsOn: ["build"],
        cache: false,
      },
    },
  },
}));
