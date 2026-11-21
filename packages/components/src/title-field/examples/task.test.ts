import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { init, update, view } from "./task.ts";

const title = Scene.role("textbox", { name: "Title" });

describe("the task title example", () => {
  it("edits the title in place and saves it on Enter", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(title).toHaveValue("Renew passport before March"),
      Scene.type(title, "Renew passport by March"),
      Scene.expect(Scene.text("Saved: Renew passport before March")).toExist(),
      Scene.keydown(title, "Enter"),
      Scene.expectHandled(),
      Scene.expect(title).toHaveValue("Renew passport by March"),
      Scene.expect(Scene.text("Saved: Renew passport by March")).toExist()
    );
  });
});
