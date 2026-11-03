import { Dialog as UiDialog } from "@foldkit/ui";
import { Announcer, Dialog, Toast } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { init, update, view } from "./dialog.ts";

const region = Scene.selector(`[${Announcer.ANNOUNCER_ATTRIBUTE}]`);
const regions = Scene.all.selector(`[${Announcer.ANNOUNCER_ATTRIBUTE}]`);

describe("the dialog example", () => {
  it("keeps the live parts at the end of the page while no dialog is open", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.Mount.resolveAll(...Toast.sceneMounts),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("dialog [data-gg-announcer]")).toBeAbsent(),
      Scene.expect(region).toHaveAttr("aria-live", "polite")
    );
  });

  it("moves them into the dialog while it is open, once, and back when it closes", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.Mount.resolveAll(...Toast.sceneMounts),
      Scene.click(Scene.role("button", { name: "settings" })),
      Scene.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Scene.Mount.resolveAll(...Dialog.sceneMounts),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("dialog [data-gg-announcer]")).toExist(),
      Scene.expect(Scene.selector("dialog .gg-toasts")).toExist(),
      Scene.click(Scene.role("button", { name: "close" })),
      Scene.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Scene.Mount.expectEnded(UiDialog.AcquireResources),
      Scene.Mount.expectEnded(Dialog.BindActionKeys),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("dialog [data-gg-announcer]")).toBeAbsent()
    );
  });
});
