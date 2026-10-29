import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Sheet from "./sheet.ts";

describe("Sheet", () => {
  it("is an article under its h1, with its byline, actions and body", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Sheet.view(
            {
              title: "Rollout checklist",
              byline: ["v4 · sam"],
              actions: [h.button([], ["edit"])],
              body: [h.p([], ["Every release goes out in two steps."])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("article")).toHaveClass("sheet"),
      Scene.expect(
        Scene.role("heading", { level: 1, name: "Rollout checklist" })
      ).toExist(),
      Scene.expect(Scene.selector(".byline")).toHaveText("v4 · sam"),
      Scene.expect(Scene.selector(".sheet-acts button")).toHaveText("edit"),
      Scene.expectAll(Scene.all.selector("article p")).toHaveCount(2)
    );
  });
});
