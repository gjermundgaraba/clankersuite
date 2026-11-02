import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as CodeSurface from "./code-surface.ts";

describe("CodeSurface", () => {
  it("is a named block of code", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          CodeSurface.view(
            { label: "Response body", body: ['{ "ok": true }'] },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Response body" })).toHaveClass(
        "code-surface"
      ),
      Scene.expect(Scene.role("group", { name: "Response body" })).toHaveText(
        '{ "ok": true }'
      )
    );
  });
});
