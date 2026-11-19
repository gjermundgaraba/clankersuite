import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Marker from "./marker.ts";

const markerScene = (config: Marker.ViewConfig) => ({
  update: (model: null) => ({ model }),
  view: (_model: null, h: HtmlBuilder<never>) => Marker.view(config, h),
});

describe("Marker", () => {
  it("is hidden from screen readers and takes its colour's class", () => {
    Scene.scene(
      markerScene({ colour: "Amber" }),
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-marker")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".gg-marker")).toHaveClass("gg-amber"),
      Scene.expect(Scene.selector(".gg-marker")).not.toHaveClass("gg-round")
    );
  });

  it("is round for a goal", () => {
    Scene.scene(
      markerScene({ colour: "Coral", kind: "Goal" }),
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-marker")).toHaveClass("gg-round")
    );
  });
});
