import { config } from "@clanker-stuff/oxlint-config";
import foldkit from "@foldkit/oxlint-plugin";

export const ignorePatterns = ["repos/", "packages/design-tokens/generated/"];

const foldkitFiles = [
  "packages/components/src/**",
  "packages/icons/src/**",
  "apps/docs/src/**",
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
      files: foldkitFiles.map((base) => `${base}/*.ts`),
      rules: recommended.rules,
    },
    ...recommended.overrides.map((override) => ({
      ...override,
      excludeFiles: withinFoldkit(override.excludeFiles),
      files: withinFoldkit(override.files),
    })),
    {
      files: ["packages/components/src/**/*.ts"],
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
        "packages/components/src/index.ts",
        "packages/components/src/scheme/index.ts",
        "packages/icons/src/index.ts",
      ],
      rules: { "oxc/no-barrel-file": "off" },
    },
    {
      files: ["packages/components/src/subscription/prefix-keys.ts"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
  ],
});
