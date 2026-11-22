import { TitleField } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, init, update, view } from "./task.ts";

const title = Scene.role("textbox", { name: "Title" });

describe("the task title example", () => {
  it("edits the title in place", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(title).toHaveValue("Renew passport before March"),
      Scene.Mount.resolve(
        { name: TitleField.BindTitleKeys.name },
        Message.GotTitleFieldMessage({
          message: TitleField.Message.CompletedBindTitleKeys(),
        })
      ),
      Scene.type(title, "Renew passport by March"),
      Scene.expect(title).toHaveValue("Renew passport by March"),
      Scene.expect(Scene.text("Saved: Renew passport before March")).toExist()
    );
  });
});
