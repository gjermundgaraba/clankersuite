import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as PageHead from "./page-head.ts";

describe("PageHead", () => {
  it("names the screen as its h1, its count beside it, its actions after", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PageHead.view(
            {
              title: "Queue",
              meta: "12 items",
              actions: [h.button([], ["add"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("heading", { name: "Queue", level: 1 })
      ).toHaveClass("page-title"),
      Scene.expect(Scene.selector(".page-name .meta")).toHaveText("12 items"),
      Scene.expect(Scene.selector(".page-acts button")).toHaveText("add")
    );
  });
});
