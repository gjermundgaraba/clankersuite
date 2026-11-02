import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Stack from "./stack.ts";

const stackView =
  (config: Stack.ViewConfig) => (_model: null, h: HtmlBuilder<never>) =>
    Stack.view(config, h);

describe("Stack", () => {
  it("stacks its body at a panel body's gap unless given another", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: stackView({ body: ["a", "b"] }),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".stack")).toHaveClass("gap-m"),
      Scene.expect(Scene.selector(".stack")).toHaveText("ab")
    );
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: stackView({ body: ["a"], gap: "L" }),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".stack")).toHaveClass("gap-l")
    );
  });
});
