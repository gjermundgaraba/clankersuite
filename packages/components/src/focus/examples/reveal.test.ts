import { Focus } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, NOTE_ID, init, update, view } from "./reveal.ts";

describe("the reveal example", () => {
  it("puts the field in the button's place and moves focus to it", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.click(Scene.role("button", { name: "add a note" })),
      Scene.Command.expectExact(Focus.Focus({ id: NOTE_ID })),
      Scene.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Scene.expect(Scene.label("Note")).toExist()
    );
  });
});
