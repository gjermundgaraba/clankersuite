import { Announcer } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { DRAFT_PANEL_ID, Message, update, view } from "./flash.ts";

describe("the flash example", () => {
  it("flashes the draft and says the change was committed", () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.click(Scene.role("button", { name: "commit" })),
      Scene.Command.expectExact(
        Announcer.Flash({ selector: `#${DRAFT_PANEL_ID}` }),
        Announcer.Announce({ text: "Committed." })
      ),
      Scene.Command.resolve(Announcer.Flash, Message.CompletedFlash()),
      Scene.Command.resolve(Announcer.Announce, Message.CompletedAnnounce())
    );
  });
});
