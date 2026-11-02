import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as TextButton from "./text-button.ts";

type Model = number;

const Message = defineMessageUnion({ Clicked: {} });

type Message = typeof Message.Type;

const update = (model: Model) => ({ model: model + 1 });

describe("TextButton", () => {
  it("is a button named by its words", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          TextButton.view({ label: "sign out", onClick: Message.Clicked() }, h),
      },
      Scene.given<Model>(0),
      Scene.expect(Scene.role("button", { name: "sign out" })).toHaveClass(
        "textbtn"
      ),
      Scene.expect(Scene.role("button", { name: "sign out" })).toHaveHandler(
        "click"
      )
    );
  });
});
