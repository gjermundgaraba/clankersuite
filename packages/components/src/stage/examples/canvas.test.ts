import { TopBar } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, init, update, view } from "./canvas.ts";

const stageStatus = Scene.within(Scene.role("main"), Scene.role("status"));

describe("the canvas example", () => {
  it("says why editing is paused until the link comes back", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.Mount.resolveAll(
        ...TopBar.sceneMounts((message) =>
          Message.GotTopBarMessage({ message })
        )
      ),
      Scene.expect(stageStatus).toHaveText(/Editing paused/u),
      Scene.click(Scene.role("button", { name: "Reconnect" })),
      Scene.expect(stageStatus).toBeEmpty()
    );
  });
});
