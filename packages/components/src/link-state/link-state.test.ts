import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as LinkState from "./link-state.ts";

const stateView =
  (state: LinkState.State) => (_model: null, h: HtmlBuilder<never>) =>
    LinkState.view({ state }, h);

const status = Scene.role("status");

describe("LinkState", () => {
  it("is a status that says its state, working while it connects", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: stateView("Reconnecting") },
      Scene.given(null),
      Scene.expect(status).toHaveText("Reconnecting"),
      Scene.expect(status).toHaveClass("gg-reconnecting")
    );
  });

  it("prints online plain, and offline on red", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: stateView("Online") },
      Scene.given(null),
      Scene.expect(status).toHaveText("Online"),
      Scene.expect(status).not.toHaveClass("gg-offline")
    );
    Scene.scene(
      { update: (model: null) => ({ model }), view: stateView("Offline") },
      Scene.given(null),
      Scene.expect(status).toHaveClass("gg-offline")
    );
  });
});
