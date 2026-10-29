import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as FieldGrid from "./field-grid.ts";

const update = (model: null) => ({ model });

const gridView = (_model: null, h: HtmlBuilder<never>) =>
  FieldGrid.view(
    {
      body: [h.label([], ["From"]), h.label([], ["To"])],
    },
    h
  );

describe("FieldGrid", () => {
  it("sets its fields side by side", () => {
    Scene.scene(
      { update, view: gridView },
      Scene.given(null),
      Scene.expect(Scene.selector(".field-grid")).toHaveText("FromTo")
    );
  });
});
