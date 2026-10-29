import { Dialog as UiDialog } from "@foldkit/ui";
import { CommandPalette } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as PaletteExample from "./palette.ts";

const REFUSAL = "The archive is read-only here (sample).";

const fresh = PaletteExample.init();

const onMovePage: PaletteExample.Model = {
  ...fresh,
  palette: CommandPalette.openAt(fresh.palette, { commandId: "move" }).model,
};

const pick = (choiceId: string) =>
  PaletteExample.Message.GotPaletteMessage({
    message: CommandPalette.Message.ClickedRow({
      row: { id: choiceId, isHeld: false, hasPage: false },
      maybeShownPage: Option.some("move"),
    }),
  });

describe("Palette example", () => {
  it("opens straight on the status page", () => {
    Story.story(
      PaletteExample.update,
      Story.given(fresh),
      Story.message(PaletteExample.Message.ClickedOpenStatus()),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.model((model) => {
        expect(CommandPalette.isOpen(model.palette)).toBe(true);
        expect(CommandPalette.maybePageId(model.palette)).toStrictEqual(
          Option.some("status")
        );
      })
    );
  });

  it("applies a pick, then the palette closes", () => {
    Story.story(
      PaletteExample.update,
      Story.given(onMovePage),
      Story.message(pick("someday")),
      Story.Command.expectExact(
        PaletteExample.ApplyPick({ commandId: "move", choiceId: "someday" })
      ),
      Story.Command.resolve(
        PaletteExample.ApplyPick,
        PaletteExample.Message.SucceededApplyPick({
          commandId: "move",
          choiceId: "someday",
        })
      ),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(model.place).toBe("someday");
        expect(CommandPalette.isOpen(model.palette)).toBe(false);
      })
    );
  });

  it("says why a pick is refused, in the palette and to the page, and keeps the palette open", () => {
    Story.story(
      PaletteExample.update,
      Story.given(onMovePage),
      Story.message(pick("archive")),
      Story.Command.resolve(
        PaletteExample.ApplyPick,
        PaletteExample.Message.FailedApplyPick({
          choiceId: "archive",
          reason: REFUSAL,
        })
      ),
      Story.expectOutMessage(
        PaletteExample.OutMessage.RefusedPick({ reason: REFUSAL })
      ),
      Story.model((model) => {
        expect(model.place).toBe("projects");
        expect(model.maybeRefusal).toStrictEqual(Option.some(REFUSAL));
        expect(CommandPalette.isOpen(model.palette)).toBe(true);
        expect(CommandPalette.isPicking(model.palette)).toBe(false);
      })
    );
  });
});
