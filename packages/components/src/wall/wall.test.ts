import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Wall from "./wall.ts";

const wallView = (_model: null, h: HtmlBuilder<never>) =>
  Wall.view(
    {
      body: [
        h.div(
          [h.Class("card")],
          [
            Wall.markView(
              { brand: [h.span([h.Class("wordmark")], ["ledger"])] },
              h
            ),
          ]
        ),
      ],
    },
    h
  );

describe("Wall", () => {
  it("is the main landmark, its card under the mark", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: wallView },
      Scene.given(null),
      Scene.expect(Scene.role("main")).toHaveClass("wall"),
      Scene.expect(Scene.role("main")).toHaveId("main"),
      Scene.expect(Scene.selector(".wall-mark .glyph svg")).toExist(),
      Scene.expect(Scene.selector(".wall-mark .wordmark")).toHaveText("ledger")
    );
  });
});
