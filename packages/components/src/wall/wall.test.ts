import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Wall from "./wall.ts";

const wallView = (_model: null, h: HtmlBuilder<never>) =>
  Wall.view(
    {
      body: [
        h.div(
          [h.Class("gg-card")],
          [
            Wall.markView(
              { brand: [h.span([h.Class("gg-wordmark")], ["ledger"])] },
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
      Scene.expect(Scene.role("main")).toHaveClass("gg-wall"),
      Scene.expect(Scene.role("main")).toHaveId("main"),
      Scene.expect(Scene.selector(".gg-wall-mark .gg-glyph svg")).toExist(),
      Scene.expect(Scene.selector(".gg-wall-mark .gg-wordmark")).toHaveText(
        "ledger"
      )
    );
  });
});
