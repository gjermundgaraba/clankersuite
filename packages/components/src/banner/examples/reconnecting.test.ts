import { Announcer } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import {
  BACK_ONLINE,
  Message,
  RECONNECTING,
  WaitBackOnline,
  update,
  view,
} from "./reconnecting.ts";

describe("the reconnecting example", () => {
  it("says the banner's state once, when it begins", () => {
    Scene.scene(
      { update, view },
      Scene.given({ link: "Online" }),
      Scene.click(Scene.role("button", { name: "drop the link" })),
      Scene.Command.expectExact(Announcer.Announce({ text: RECONNECTING })),
      Scene.Command.resolve(Announcer.Announce, Message.CompletedAnnounce()),
      Scene.expect(Scene.text(RECONNECTING)).toExist()
    );
  });

  it("says the link is back on retry, then takes the banner away", () => {
    Scene.scene(
      { update, view },
      Scene.given({ link: "Reconnecting" }),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.Command.resolve(Announcer.Announce, Message.CompletedAnnounce()),
      Scene.expect(Scene.text(BACK_ONLINE)).toExist(),
      Scene.Command.resolve(WaitBackOnline, Message.ElapsedBackOnline()),
      Scene.expect(Scene.text(BACK_ONLINE)).toBeAbsent()
    );
  });
});
