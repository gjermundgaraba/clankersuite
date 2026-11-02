import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Identity from "./identity.ts";

describe("Identity", () => {
  it("prints the monogram beside the name and its meta line, the name read once", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Identity.view(
            { label: "Sam Rivera", meta: ["client 4f2a"], isLarge: true },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-identity .gg-monogram")).toHaveClass(
        "gg-large"
      ),
      Scene.expect(Scene.selector(".gg-identity .gg-monogram")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.role("img")).toBeAbsent(),
      Scene.expect(Scene.selector(".gg-identity-text strong")).toHaveText(
        "Sam Rivera"
      ),
      Scene.expect(Scene.selector(".gg-identity-text .gg-meta")).toHaveText(
        "client 4f2a"
      ),
      Scene.expect(Scene.selector(".gg-identity")).toHaveClass("gg-large")
    );
  });
});
