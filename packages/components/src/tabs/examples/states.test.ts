import { Tabs as UiTabs } from "@foldkit/ui";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { init, update, view } from "./states.ts";

describe("the states example", () => {
  it("shows the panel of the tab the reader picks", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(Scene.text("Four items are open.")).toExist(),
      Scene.click(Scene.role("tab", { name: "waiting" })),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(Scene.role("tab", { name: "waiting" })).toHaveAttr(
        "aria-selected",
        "true"
      ),
      Scene.expect(Scene.text("Two items wait on someone.")).toExist(),
      Scene.expect(Scene.text("Four items are open.")).not.toExist()
    );
  });
});
