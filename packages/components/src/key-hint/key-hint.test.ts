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
      Scene.expect(Scene.selector("kbd.gg-key-hint")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector("kbd.gg-key-hint")).toHaveText("Ctrl+K")
    );
  });
});

const notesView = (platform: KeyPlatform, h: HtmlBuilder<never>) =>
  h.p(
    [],
    KeyHint.notesView(
      [
        { keys: "J", otherKeys: ["K"], does: "move" },
        { keys: "ArrowUp", otherKeys: ["ArrowDown"], does: "pick" },
      ],
      platform,
      h
    )
  );

describe("KeyHint notes", () => {
  it("boxes the first key that does the same and prints the rest as words, but arrows share one box", () => {
    Scene.scene(
      { update, view: notesView },
      Scene.given<KeyPlatform>("Other"),
      Scene.expectAll(Scene.all.selector("kbd.gg-key-hint")).toHaveCount(2),
      Scene.expect(Scene.selector("p")).toHaveText("J K move↑↓ pick")
    );
  });
});
