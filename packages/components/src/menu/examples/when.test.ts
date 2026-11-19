import { Menu } from "@gjermundgaraba/components";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./when.ts";

describe("the when menu example", () => {
  it("moves the task to the chosen time", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotMenuMessage({
          message: Menu.Message.SelectedItem({ id: "Tomorrow", kind: "Radio" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.when).toBe("Tomorrow");
      })
    );
  });
});
