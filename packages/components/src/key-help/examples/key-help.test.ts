import { Dialog as UiDialog } from "@foldkit/ui";
import { KeyHelp } from "@gjermundgaraba/components";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./key-help.ts";

describe("the key help example", () => {
  it("opens the key help from ? and from the button, once", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.PressedHelpKey()),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.model((model) => {
        expect(KeyHelp.isOpen(model.keyHelp)).toBe(true);
      }),
      Story.message(Message.PressedHelpKey()),
      Story.Command.expectNone()
    );
  });

  it("moves through the items with the keys it lists, and stops at the ends", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.PressedPreviousKey()),
      Story.message(Message.PressedNextKey()),
      Story.message(Message.PressedNextKey()),
      Story.model((model) => {
        expect(model.position).toBe(3);
      }),
      Story.message(Message.PressedFirstKey()),
      Story.model((model) => {
        expect(model.position).toBe(1);
      })
    );
  });
});
