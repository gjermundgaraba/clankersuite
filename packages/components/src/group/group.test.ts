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
      Scene.expect(Scene.selector(".gg-group")).toHaveClass("gg-group"),
      Scene.expect(Scene.selector(".gg-group")).toHaveClass("gg-gap-s"),
      Scene.expect(Scene.selector(".gg-group")).toHaveText("namechip")
    );
  });

  it("takes a role and a name for a set of chips", () => {
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div(
            [],
            [
              Group.view(
                {
                  body: ["chip"],
                  attributes: [h.Role("group"), h.AriaLabel("Filters")],
                },
                h
              ),
            ]
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Filters" })).toHaveClass(
        "gg-group"
      )
    );
  });
});
