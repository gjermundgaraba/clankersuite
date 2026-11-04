import { Dialog as UiDialog, Toast as UiToast } from "@foldkit/ui";
import { CommandPalette, Toast } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { ApplyPick, Message, init, update } from "./palette.ts";
import type { Model } from "./palette.ts";

const REFUSAL = "The archive is read-only here.";

const fresh = init().model;

const onMovePage: Model = modifyFields(fresh, {
  palette: (palette) =>
    CommandPalette.openAt(palette, { commandId: "move" }).model,
});

const pick = (choiceId: string) =>
  Message.GotPaletteMessage({
    message: CommandPalette.Message.ClickedRow({
      row: { id: choiceId, isHeld: false, hasPage: false },
      maybeShownPage: Option.some("move"),
    }),
  });

const toastTitles = (model: Model): readonly string[] =>
  Array.map(model.toasts.stack.entries, (entry) => entry.payload.title);

describe("the palette example", () => {
  it("opens straight on the status page", () => {
    Story.story(
      update,
      Story.given(fresh),
      Story.message(Message.ClickedOpenStatus()),
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
      update,
      Story.given(onMovePage),
      Story.message(pick("someday")),
      Story.Command.expectExact(
        ApplyPick({ commandId: "move", choiceId: "someday" })
      ),
      Story.Command.resolve(
        ApplyPick,
        Message.SucceededApplyPick({ commandId: "move", choiceId: "someday" })
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

  it("says why a pick is refused, in the palette and in a toast, and keeps the palette open", () => {
    Story.story(
      update,
      Story.given(onMovePage),
      Story.message(pick("archive")),
      Story.Command.resolve(
        ApplyPick,
        Message.FailedApplyPick({ choiceId: "archive", reason: REFUSAL })
      ),
      Story.Command.expectHas(
        Toast.AnnounceSlip({
          stackId: "palette-example-toasts",
          text: `Not moved. ${REFUSAL}`,
        })
      ),
      Story.Command.resolve(
        Toast.AnnounceSlip,
        Toast.Message.CompletedAnnounceSlip()
      ),
      UiToast.test.drainEntry({ entryId: "palette-example-toasts-entry-0" }),
      Story.model((model) => {
        expect(model.place).toBe("projects");
        expect(model.maybeRefusal).toStrictEqual(Option.some(REFUSAL));
        expect(toastTitles(model)).toStrictEqual(["Not moved"]);
        expect(CommandPalette.isOpen(model.palette)).toBe(true);
        expect(CommandPalette.isPicking(model.palette)).toBe(false);
      })
    );
  });

  it("runs the edit command from its key", () => {
    Story.story(
      update,
      Story.given(fresh),
      Story.message(Message.PressedEditKey()),
      Story.model((model) => {
        expect(model.maybeLastRun).toStrictEqual(Option.some("edit"));
      })
    );
  });
});
