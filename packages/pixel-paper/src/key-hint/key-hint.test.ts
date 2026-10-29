import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as KeyHint from "./key-hint.ts";
import type { KeyPlatform } from "./key-label.ts";

const update = (model: KeyPlatform) => ({ model });

const hintView = (platform: KeyPlatform, h: HtmlBuilder<never>) =>
  KeyHint.view(
    {
      keys: "Mod+K",
      platform,
    },
    h
  );

describe("KeyHint", () => {
  it("prints the key for the eye only, in the platform's words", () => {
    Scene.scene(
      { update, view: hintView },
      Scene.given<KeyPlatform>("Other"),
      Scene.expect(Scene.selector("kbd.key-hint")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector("kbd.key-hint")).toHaveText("Ctrl+K")
    );
  });
});
