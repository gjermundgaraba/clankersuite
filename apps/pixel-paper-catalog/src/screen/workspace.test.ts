import { Dialog as UiDialog } from "@foldkit/ui";
import { ConfirmDialog, Rail } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as WorkspaceScreen from "./workspace.ts";

describe("Workspace screen", () => {
  it("asks before it stops, and confirming closes the confirm", () => {
    Story.story(
      WorkspaceScreen.update,
      Story.given(WorkspaceScreen.init()),
      Story.message(WorkspaceScreen.Message.ClickedStop()),
      Story.Command.expectExact(UiDialog.ShowDialog),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.model((model) => {
        expect(WorkspaceScreen.isDialogOpen(model)).toBe(true);
      }),
      Story.message(
        WorkspaceScreen.Message.GotStopConfirmMessage({
          message: ConfirmDialog.Message.ClickedConfirm(),
        })
      ),
      Story.Command.expectExact(UiDialog.CloseDialog),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(WorkspaceScreen.isDialogOpen(model)).toBe(false);
      })
    );
  });

  it("keeps the rail hidden while its toggle has hidden it, beside the bench", () => {
    Story.story(
      WorkspaceScreen.update,
      Story.given(WorkspaceScreen.init()),
      Story.message(
        WorkspaceScreen.Message.GotRailMessage({
          message: Rail.Message.ClickedToggle(),
        })
      ),
      Story.Command.resolve(
        Rail.FocusRailToggle,
        Rail.Message.CompletedFocusRailToggle()
      ),
      Story.model((model) => {
        expect(model.isRailHidden).toBe(true);
      })
    );
  });
});
