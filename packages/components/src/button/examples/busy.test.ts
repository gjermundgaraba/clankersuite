import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, Send, update, view } from "./busy.ts";

describe("the busy example", () => {
  it("holds the button while the send runs, then lets it go", () => {
    Scene.scene(
      { update, view },
      Scene.given({ isSending: false }),
      Scene.click(Scene.role("button", { name: "send" })),
      Scene.expect(Scene.role("button", { name: "send" })).toHaveAttr(
        "aria-busy",
        "true"
      ),
      Scene.Command.resolve(Send, Message.CompletedSend()),
      Scene.expect(Scene.role("button", { name: "send" })).not.toHaveAttr(
        "aria-busy"
      )
    );
  });
});
