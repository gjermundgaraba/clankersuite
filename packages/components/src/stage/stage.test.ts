import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Stage from "./stage.ts";

const stageView =
  (isPaused: boolean) => (_model: null, h: HtmlBuilder<never>) =>
    Stage.view(
      {
        body: [h.canvas([])],
        ...(isPaused ? { paused: ["The link dropped."] } : {}),
      },
      h
    );

describe("Stage", () => {
  it("is the main landmark holding the canvas", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: stageView(false) },
      Scene.given(null),
      Scene.expect(Scene.role("main")).toHaveId("main"),
      Scene.expect(Scene.selector(".stage-canvas canvas")).toExist(),
      Scene.expect(Scene.selector(".stage-work")).not.toHaveAttr("inert"),
      Scene.expect(Scene.role("status")).toBeEmpty(),
      Scene.expect(Scene.selector(".stage-paused")).toBeAbsent()
    );
  });

  it("makes the work inert while paused and says why as a status", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: stageView(true) },
      Scene.given(null),
      Scene.expect(Scene.selector(".stage-work")).toHaveAttr("inert"),
      Scene.expect(Scene.role("status")).toHaveText("The link dropped.")
    );
  });
});
