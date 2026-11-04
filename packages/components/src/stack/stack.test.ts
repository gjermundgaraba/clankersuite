import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Stack from "./stack.ts";

const stackView =
  (config: Stack.ViewConfig<never>) => (_model: null, h: HtmlBuilder<never>) =>
    Stack.view(config, h);

describe("Stack", () => {
  it("stacks its body at a panel body's gap unless given another", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: stackView({ body: ["a", "b"] }),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-stack")).toHaveClass("gg-gap-m"),
      Scene.expect(Scene.selector(".gg-stack")).toHaveText("ab")
    );
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: stackView({ body: ["a"], gap: "L" }),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-stack")).toHaveClass("gg-gap-l")
    );
  });

  it("takes the caller's attributes, a named region, its classes kept", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Stack.view(
            {
              body: ["a"],
              attributes: [h.Role("region"), h.AriaLabel("Keys")],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("region", { name: "Keys" })).toHaveClass(
        "gg-stack"
      ),
      Scene.expect(Scene.role("region", { name: "Keys" })).toHaveClass(
        "gg-gap-m"
      )
    );
  });
});
