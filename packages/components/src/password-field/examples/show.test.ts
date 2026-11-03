import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { update, view } from "./show.ts";

describe("the show example", () => {
  it("prints the password in the clear while the toggle is pressed", () => {
    Scene.scene(
      { update, view },
      Scene.given({ password: "a sample password", isShown: false }),
      Scene.expect(Scene.label("New password")).toHaveAttr("type", "password"),
      Scene.click(Scene.role("button", { name: "Show password" })),
      Scene.expect(Scene.label("New password")).toHaveAttr("type", "text"),
      Scene.expect(Scene.role("button", { name: "Show password" })).toHaveAttr(
        "aria-pressed",
        "true"
      )
    );
  });
});
