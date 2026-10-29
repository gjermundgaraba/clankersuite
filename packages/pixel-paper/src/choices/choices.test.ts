import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Choices from "./choices.ts";

const update = (model: null) => ({ model });

const choicesView = (_model: null, h: HtmlBuilder<never>) =>
  Choices.view(
    {
      body: [h.span([h.Class("choice")], ["Notify me"])],
      isInline: true,
    },
    h
  );

describe("Choices", () => {
  it("lays out its choices, inline when asked", () => {
    Scene.scene(
      { update, view: choicesView },
      Scene.given(null),
      Scene.expect(Scene.selector(".choices")).toHaveClass("inline"),
      Scene.expect(Scene.selector(".choices .choice")).toHaveText("Notify me")
    );
  });
});
