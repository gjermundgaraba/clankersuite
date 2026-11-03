import { Menu } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./create.ts";

const resolveFocus = Story.Command.resolve(
  Menu.Focus,
  Menu.Message.CompletedFocus()
);

describe("the create menu example", () => {
  it("notes what the New menu made, from the menu or its key", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotCreateMessage({
          message: Menu.Message.SelectedItem({ id: "area", kind: "Action" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeLastMade).toStrictEqual(Option.some("area"));
      }),
      Story.message(Message.PressedNewTaskKey()),
      Story.model((model) => {
        expect(model.maybeLastMade).toStrictEqual(Option.some("task"));
      })
    );
  });

  it("picks the area the primary toggle shows", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotAreaPickerMessage({
          message: Menu.Message.SelectedItem({ id: "research", kind: "Radio" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.area.id).toBe("research");
      })
    );
  });
});
