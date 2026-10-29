import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as PropsList from "./props-list.ts";

describe("PropsList", () => {
  it("prints each property as a term, its value, and its controls", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PropsList.view(
            {
              items: [
                { label: "Region", value: ["eu-north"] },
                {
                  label: "Key",
                  value: ["pk_live_4f2a"],
                  isCode: true,
                  actions: [h.button([], ["copy"])],
                },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expectAll(Scene.all.selector("dl.props dt")).toHaveCount(2),
      Scene.expect(Scene.first(Scene.all.selector("dl.props dt"))).toHaveText(
        "Region"
      ),
      Scene.expect(Scene.selector("dd code")).toHaveText("pk_live_4f2a"),
      Scene.expect(Scene.selector("dd.acts button")).toHaveText("copy")
    );
  });
});
