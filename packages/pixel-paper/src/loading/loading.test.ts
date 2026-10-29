import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Loading from "./loading.ts";

describe("Loading", () => {
  it("is a polite status that says what is coming, beside a hidden cursor", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Loading.view({ isLoading: true, label: "loading the items" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("status")).toHaveText("loading the items"),
      Scene.expect(Scene.role("status")).toHaveClass("loading"),
      Scene.expect(Scene.selector(".loading .cursor")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });

  it("says loading by default", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Loading.view({ isLoading: true }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("status")).toHaveText("loading")
    );
  });

  it("stays in place, empty, idle and out of the flow, once the content is here", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Loading.view({ isLoading: false }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("status")).toBeEmpty(),
      Scene.expect(Scene.role("status")).not.toHaveClass("loading"),
      Scene.expect(Scene.role("status")).toHaveClass("loading-idle")
    );
  });
});
