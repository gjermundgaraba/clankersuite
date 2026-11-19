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

  it("moves the task to the day picked, until a time is chosen again", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotMenuMessage({
          message: Menu.Message.PickedDay({
            id: "pick-day",
            value: "2026-11-27",
          }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.day).toBe("2026-11-27");
      }),
      Story.message(
        Message.GotMenuMessage({
          message: Menu.Message.SelectedItem({ id: "Someday", kind: "Radio" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.when).toBe("Someday");
        expect(model.day).toBe("");
      })
    );
  });
});
