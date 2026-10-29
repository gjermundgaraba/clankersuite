import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Wrap from "./wrap.ts";

const update = (model: null) => ({ model });

describe("Wrap", () => {
  it("wraps its line at the small gap", () => {
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div([], [Wrap.view({ body: ["a", "b"] }, h)]),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".wrap")).toHaveClass("wrap"),
      Scene.expect(Scene.selector(".wrap")).toHaveClass("gap-s"),
      Scene.expect(Scene.selector(".wrap")).toHaveText("ab")
    );
  });

  it("takes the caller's attributes, a named group, its classes kept", () => {
    Scene.scene(
      {
        update,
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div(
            [],
            [
              Wrap.view(
                {
                  body: ["a"],
                  attributes: [h.Role("group"), h.AriaLabel("Status filters")],
                },
                h
              ),
            ]
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Status filters" })).toHaveClass(
        "wrap"
      ),
      Scene.expect(Scene.role("group", { name: "Status filters" })).toHaveClass(
        "gap-s"
      )
    );
  });
});
