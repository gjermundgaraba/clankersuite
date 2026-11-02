import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Outcome from "./outcome.ts";

const update = (model: null) => ({ model });

const outcomeView = (_model: null, h: HtmlBuilder<never>) =>
  Outcome.view(
    {
      title: "Session ended",
      body: ["Sign in again to carry on."],
      tone: "Error",
      detail: [h.code([], ["E401"])],
      bodyAttributes: [h.Id("outcome-body")],
    },
    h
  );

describe("Outcome", () => {
  it("says a state in full: its tone's glyph, a title, a sentence and the detail", () => {
    Scene.scene(
      { update, view: outcomeView },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-outcome .gg-glyph")).toHaveClass(
        "gg-error"
      ),
      Scene.expect(Scene.selector(".gg-outcome .gg-glyph svg")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".gg-outcome-body")).toHaveId("outcome-body"),
      Scene.expect(Scene.selector(".gg-outcome-body strong")).toHaveText(
        "Session ended"
      ),
      Scene.expect(Scene.selector(".gg-outcome-body p")).toHaveText(
        "Sign in again to carry on."
      ),
      Scene.expect(Scene.selector(".gg-outcome-body code")).toHaveText("E401")
    );
  });
});
