import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Group from "./group.ts";

const update = (model: null) => ({ model });

describe("Group", () => {
  it("holds one line at the small gap", () => {
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div([], [Group.view({ body: ["name", "chip"] }, h)]),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".group")).toHaveClass("group"),
      Scene.expect(Scene.selector(".group")).toHaveClass("gap-s"),
      Scene.expect(Scene.selector(".group")).toHaveText("namechip")
    );
  });
});
