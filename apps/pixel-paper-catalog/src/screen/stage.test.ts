import { Dialog as UiDialog } from "@foldkit/ui";
import { Announcer, ConfirmDialog } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as StageScreen from "./stage.ts";

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  StageScreen.Message.CompletedAnnounce()
);

describe("Stage screen", () => {
  it("drops the link and brings it back when its time is up", () => {
    Story.story(
      StageScreen.update,
      Story.given(StageScreen.init()),
      Story.message(StageScreen.Message.ClickedDropLink()),
      Story.Command.expectExact(StageScreen.WaitBeforeLinkReturn()),
      Story.model((model) => {
        expect(model.isLinkDropped).toBe(true);
      }),
      Story.Command.resolve(
        StageScreen.WaitBeforeLinkReturn,
        StageScreen.Message.CompletedWaitBeforeLinkReturn()
      ),
      Story.model((model) => {
        expect(model.isLinkDropped).toBe(false);
      })
    );
  });

  it("starts no second timer while the link is down, so it comes back when the first ends", () => {
    const dropped = { ...StageScreen.init(), isLinkDropped: true };
    Story.story(
      StageScreen.update,
      Story.given(dropped),
      Story.message(StageScreen.Message.ClickedDropLink()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model).toStrictEqual(dropped);
      })
    );
  });

  it("closes windows and says so, gives the stage back when the whole-stage window closes, and reopens them all", () => {
    Story.story(
      StageScreen.update,
      Story.given(StageScreen.init()),
      Story.message(StageScreen.Message.ToggledWholeStage()),
      Story.model((model) => {
        expect(model.isWhole).toBe(true);
      }),
      Story.message(
        StageScreen.Message.ClickedCloseWindow({ stageWindow: "Terminal" })
      ),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Closed the sample terminal." })
      ),
      resolveAnnounce,
      Story.message(
        StageScreen.Message.ClickedCloseWindow({ stageWindow: "Note" })
      ),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Closed the sample note." })
      ),
      resolveAnnounce,
      Story.model((model) => {
        expect(model.isWhole).toBe(false);
        expect(model.closed).toStrictEqual(["Terminal", "Note"]);
      }),
      Story.message(StageScreen.Message.ClickedReopen()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Reopened every window." })
      ),
      resolveAnnounce,
      Story.model((model) => {
        expect(model.closed).toStrictEqual([]);
      })
    );
  });

  it("starts the machine at once, and asks before it stops it", () => {
    Story.story(
      StageScreen.update,
      Story.given(StageScreen.init()),
      Story.message(StageScreen.Message.ClickedStart()),
      Story.Command.expectNone(),
      Story.message(StageScreen.Message.ClickedStop()),
      Story.Command.expectExact(UiDialog.ShowDialog),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.model((model) => {
        expect(model.isStarting).toBe(true);
        expect(StageScreen.isDialogOpen(model)).toBe(true);
      }),
      Story.message(
        StageScreen.Message.GotStopConfirmMessage({
          message: ConfirmDialog.Message.ClickedConfirm(),
        })
      ),
      Story.Command.expectExact(UiDialog.CloseDialog),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(model.isStarting).toBe(false);
        expect(StageScreen.isDialogOpen(model)).toBe(false);
      })
    );
  });
});
