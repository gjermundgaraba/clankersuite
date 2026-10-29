import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Banner from "./banner.ts";

describe("Banner", () => {
  it("says the interface's state beside its tone's glyph, before its actions", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Banner.view(
            {
              tone: "Warn",
              body: ["Reconnecting. Your changes wait here."],
              actions: [h.button([], ["retry"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".banner")).toHaveText(
        "Reconnecting. Your changes wait here.retry"
      ),
      Scene.expect(Scene.selector(".banner .glyph")).not.toHaveClass("error"),
      Scene.expect(Scene.selector(".banner button")).toHaveText("retry")
    );
  });
});
