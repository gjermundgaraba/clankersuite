import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { init, update, view } from "./goals.ts";

describe("the goals example", () => {
  it("counts a goal's outcomes as they are checked off", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(
        Scene.role("article", { name: "Ship the beta" })
      ).toContainText("1 of 2 outcomes"),
      Scene.click(Scene.role("checkbox", { name: "Ten users" })),
      Scene.expect(Scene.role("checkbox", { name: "Ten users" })).toHaveAttr(
        "aria-checked",
        "true"
      ),
      Scene.expect(
        Scene.role("article", { name: "Ship the beta" })
      ).toContainText("2 of 2 outcomes"),
      Scene.expect(
        Scene.role("article", { name: "Launch clankermem v1" })
      ).toContainText("0 of 3 outcomes")
    );
  });
});
