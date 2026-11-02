import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Bench from "./bench.ts";

const benchView = (_model: null, h: HtmlBuilder<never>) =>
  Bench.view(
    {
      head: [h.h1([], ["Spring release"])],
      body: [h.div([h.Class("reel")], ["the panes"])],
    },
    h
  );

describe("Bench", () => {
  it("is the main landmark: its head, then the work", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: benchView },
      Scene.given(null),
      Scene.expect(Scene.role("main")).toHaveId("main"),
      Scene.expect(Scene.role("main")).toHaveClass("bench"),
      Scene.expect(Scene.nth(Scene.all.selector(".bench div"), 0)).toHaveClass(
        "bench-head"
      ),
      Scene.expect(Scene.selector(".bench-head h1")).toHaveText(
        "Spring release"
      ),
      Scene.expect(Scene.selector(".bench-work .reel")).toHaveText("the panes")
    );
  });
});
