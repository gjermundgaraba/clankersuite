import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Prose from "./prose.ts";

describe("Prose", () => {
  it("holds authored elements as they are", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Prose.view(
            { body: [h.h2([], ["Before"]), h.p([], ["Announce it."])] },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".prose h2")).toHaveText("Before"),
      Scene.expect(Scene.selector(".prose p")).toHaveText("Announce it.")
    );
  });
});
