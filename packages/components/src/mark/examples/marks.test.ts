import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { update, view } from "./marks.ts";

describe("the marks example", () => {
  it("flags and unflags with the toggle mark", () => {
    Scene.scene(
      { update, view },
      Scene.given({ isFlagged: false }),
      Scene.click(Scene.role("button", { name: "Flag" })),
      Scene.expect(Scene.role("button", { name: "Flag" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.click(Scene.role("button", { name: "Flag" })),
      Scene.expect(Scene.role("button", { name: "Flag" })).toHaveAttr(
        "aria-pressed",
        "false"
      )
    );
  });
});
