import { Menu } from "@gjermundgaraba/components";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./inbox.ts";

describe("the inbox example", () => {
  it("brings up the next item as each is decided, its area from the chip until then", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotAreaMessage({
          message: Menu.Message.SelectedItem({ id: "Home", kind: "Radio" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.area).toBe("Home");
      }),
      Story.message(Message.Decided({ where: "Focus" })),
      Story.model((model) => {
        expect(model.decided).toBe(1);
        expect(model.title).toBe("Look into flaky CI on clankerbox");
        expect(model.area).toBe("Work");
      })
    );
  });

  it("checks off an item waiting under the card", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ToggledUpNext({ id: "dentist", isDone: true })),
      Story.model((model) => {
        expect(model.doneIds).toStrictEqual(["dentist"]);
      })
    );
  });
});
