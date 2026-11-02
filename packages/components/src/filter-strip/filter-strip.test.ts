import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as FilterStrip from "./filter-strip.ts";

const update = (model: null) => ({ model });

describe("FilterStrip", () => {
  it("is a group named Filters, or by its label, holding its chips", () => {
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          FilterStrip.view({ body: [h.button([], ["open"])] }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Filters" })).toHaveClass(
        "strip"
      ),
      Scene.expect(Scene.role("group", { name: "Filters" })).toContainText(
        "open"
      )
    );
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          FilterStrip.view({ label: "Find a glyph", body: [] }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Find a glyph" })).toHaveClass(
        "strip"
      )
    );
  });
});
