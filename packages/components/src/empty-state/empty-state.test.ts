import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as EmptyState from "./empty-state.ts";

describe("EmptyState", () => {
  it("says what is missing in caps, how it fills in a sentence, then its action", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          EmptyState.view(
            {
              title: "Nothing queued",
              headingLevel: "Strong",
              body: ["Capture a task to start."],
              actions: [h.button([h.Class("spec-action")], ["capture"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".empty strong.empty-title")).toHaveText(
        "Nothing queued"
      ),
      Scene.expect(Scene.role("heading")).toBeAbsent(),
      Scene.expect(Scene.selector(".empty p")).toHaveText(
        "Capture a task to start."
      ),
      Scene.expect(Scene.role("button", { name: "capture" })).toExist()
    );
  });

  it("prints no sentence when it has none", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          EmptyState.view({ title: "No activity yet", headingLevel: 3 }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".empty p")).toBeAbsent()
    );
  });

  it("titles a page's or a section's main content with a heading at the level given", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          EmptyState.view(
            { title: "Sign in to see your tasks", headingLevel: 1 },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("heading", { level: 1 })).toHaveText(
        "Sign in to see your tasks"
      ),
      Scene.expect(Scene.selector(".empty strong")).toBeAbsent()
    );
  });
});
