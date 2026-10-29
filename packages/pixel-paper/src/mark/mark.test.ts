import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Mark from "./mark.ts";

describe("Mark.readingView", () => {
  it("prints the figure on the mark's amber, read as its words", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Mark.readingView({ label: "91%" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".mark")).toHaveText("91%"),
      Scene.expect(Scene.selector(".mark")).toHaveClass("mark"),
      Scene.expect(Scene.selector(".mark")).toHaveClass("reading")
    );
  });
});
