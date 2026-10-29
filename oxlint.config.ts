import { config } from "@clanker-stuff/oxlint-config";
import foldkit from "@foldkit/oxlint-plugin";

export const ignorePatterns = ["repos/"];

const foldkitFiles = [
  "packages/pixel-paper/src/**",
  "apps/pixel-paper-catalog/src/**",
];

const { recommended } = foldkit.configs;

const withinFoldkit = (patterns: readonly string[] = []) =>
  foldkitFiles.flatMap((base) =>
    patterns.map((pattern) => `${base.slice(0, -"**".length)}${pattern}`)
  );

export default config({
  jsPlugins: recommended.jsPlugins,
  assertFunctions: [
    "Scene.scene",
    "Story.story",
    "reelScene",
    "tabbedScene",
    "timeScene",
  ],
  ignorePatterns,
  overrides: [
    { env: { browser: true }, files: foldkitFiles },
    {
      files: ["apps/pixel-paper-catalog/src/example/**"],
      rules: { "clanker/no-prose-comments": "off" },
    },
    {
      files: foldkitFiles.map((base) => `${base}/*.ts`),
      rules: recommended.rules,
    },
    ...recommended.overrides.map((override) => ({
      ...override,
      excludeFiles: withinFoldkit(override.excludeFiles),
      files: withinFoldkit(override.files),
    })),
    {
      files: ["packages/pixel-paper/src/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["../*/index.ts"],
                message:
                  "Import the sibling's own file; index.ts is the public surface.",
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        "packages/pixel-paper/src/index.ts",
        "packages/pixel-paper/src/scheme/index.ts",
      ],
      rules: { "oxc/no-barrel-file": "off" },
    },
    {
      files: ["packages/pixel-paper/src/subscription/prefix-keys.ts"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      files: ["apps/pixel-paper-catalog/src/page/foundations.ts"],
      rules: { "import/default": "off" },
    },
    {
      files: [
        "apps/pixel-paper-catalog/src/entry.server.ts",
        "apps/pixel-paper-catalog/src/entry.ts",
        "apps/pixel-paper-catalog/src/live-region.ts",
        "apps/pixel-paper-catalog/src/main.ts",
        "apps/pixel-paper-catalog/src/message.ts",
        "apps/pixel-paper-catalog/src/model.ts",
        "apps/pixel-paper-catalog/src/page/components.ts",
        "apps/pixel-paper-catalog/src/page/foundations.ts",
      ],
      rules: { "import/no-cycle": "off" },
    },
  ],
});
