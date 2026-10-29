import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Secret from "./secret.ts";

describe("Secret", () => {
  it("prints the value as code named by its label, beside its copy button", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Secret.view(
            {
              value: "pk_live_4f9a",
              label: "API key",
              actions: [h.button([h.Type("button")], ["Copy API key"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "API key" })).toHaveText(
        "pk_live_4f9a"
      ),
      Scene.expect(Scene.role("button", { name: "Copy API key" })).toExist()
    );
  });
});
