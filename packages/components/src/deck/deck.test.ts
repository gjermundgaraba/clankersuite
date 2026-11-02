import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Deck from "./deck.ts";

describe("Deck", () => {
  it("is the main landmark, the skip link's target", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Deck.view({ body: ["panels"] }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("main")).toHaveId("main"),
      Scene.expect(Scene.role("main")).toHaveClass("deck")
    );
  });
});
