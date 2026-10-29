import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as FlashWord from "./flash-word.ts";

const flashScene = {
  update: (model: Option.Option<string>) => ({ model }),
  view: (model: Option.Option<string>, h: HtmlBuilder<never>) =>
    FlashWord.view({ maybeWord: model }, h),
};

describe("FlashWord", () => {
  it("is a status on the page before the word comes, so the word is heard", () => {
    Scene.scene(
      flashScene,
      Scene.given(Option.none()),
      Scene.expect(Scene.role("status")).toHaveClass("flash-word"),
      Scene.expect(Scene.role("status")).toHaveText("")
    );
  });

  it("prints the word from the Model", () => {
    Scene.scene(
      flashScene,
      Scene.given(Option.some("saved")),
      Scene.expect(Scene.role("status")).toHaveText("saved")
    );
  });
});
