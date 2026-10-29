import { Toast as UiToast } from "@foldkit/ui";
import { CommandPalette, Toast } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as PaletteExample from "../example/palette.ts";
import * as CommandExamples from "./commands.ts";

const REFUSAL = "The archive is read-only here (sample).";

const fresh = CommandExamples.init();

const onMovePage: CommandExamples.Model = {
  ...fresh,
  palette: {
    ...fresh.palette,
    palette: CommandPalette.openAt(fresh.palette.palette, { commandId: "move" })
      .model,
  },
};

const toastTitles = (model: CommandExamples.Model): readonly string[] =>
  Array.map(model.toasts.toasts.stack.entries, (entry) => entry.payload.title);

describe("Command examples", () => {
  it("raises a toast when the palette refuses a pick", () => {
    Story.story(
      CommandExamples.update,
      Story.given(onMovePage),
      Story.message(
        CommandExamples.Message.GotPaletteMessage({
          message: PaletteExample.Message.GotPaletteMessage({
            message: CommandPalette.Message.ClickedRow({
              row: { id: "archive", isHeld: false, hasPage: false },
              maybeShownPage: Option.some("move"),
            }),
          }),
        })
      ),
      Story.Command.resolve(
        PaletteExample.ApplyPick,
        PaletteExample.Message.FailedApplyPick({
          choiceId: "archive",
          reason: REFUSAL,
        })
      ),
      Story.Command.expectHas(
        Toast.AnnounceSlip({
          stackId: "page-toasts",
          text: `Not moved. ${REFUSAL}`,
        })
      ),
      Story.Command.resolve(
        Toast.AnnounceSlip,
        Toast.Message.CompletedAnnounceSlip()
      ),
      UiToast.test.drainEntry({ entryId: "page-toasts-entry-0" }),
      Story.model((model) => {
        expect(toastTitles(model)).toStrictEqual(["Not moved"]);
      })
    );
  });
});
