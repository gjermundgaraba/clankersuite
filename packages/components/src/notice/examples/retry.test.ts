import { Scene, Story } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, Reconnect, init, update, view } from "./retry.ts";

const reconnect = Scene.role("button", { name: "reconnect" });

describe("the retry example", () => {
  it("holds the button while it reconnects, then says it is back", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(Scene.text("Offline")).toExist(),
      Scene.click(reconnect),
      Scene.expect(reconnect).toHaveAttr("aria-busy", "true"),
      Scene.Command.resolve(Reconnect, Message.CompletedReconnect()),
      Scene.expect(Scene.text("Connected again.")).toExist(),
      Scene.expect(reconnect).not.toExist()
    );
  });

  it("starts one reconnect, however often it is asked", () => {
    Story.story(
      update,
      Story.given({ connection: "Reconnecting" as const }),
      Story.message(Message.ClickedReconnect()),
      Story.Command.expectNone()
    );
  });
});
