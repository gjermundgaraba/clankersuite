import { Menu } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./row-actions.ts";

const pinNotes = Message.GotRowActionsMessage({
  rowId: "row-notes",
  message: Menu.Message.SelectedItem({ id: "pin", kind: "Check" }),
});

describe("the row actions example", () => {
  it("pins a row from its own menu, and unpins it", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(pinNotes),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual(["row-notes"]);
      }),
      Story.message(pinNotes),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual([]);
      })
    );
  });

  it("notes an action on the row it came from", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotRowActionsMessage({
          rowId: "row-budget",
          message: Menu.Message.SelectedItem({ id: "rename", kind: "Action" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.maybeLastAction).toStrictEqual(
          Option.some("rename budget.csv")
        );
      })
    );
  });
});
