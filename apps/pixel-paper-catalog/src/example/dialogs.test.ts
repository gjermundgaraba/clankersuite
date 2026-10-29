import { Dialog as UiDialog } from "@foldkit/ui";
import {
  Announcer,
  ConfirmDialog,
  Dialog,
  Focus,
} from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as DialogsExample from "./dialogs.ts";

const resolveShow = Story.Command.resolve(
  UiDialog.ShowDialog,
  UiDialog.Message.SucceededShowDialog()
);

const resolveClose = Story.Command.resolve(
  UiDialog.CloseDialog,
  UiDialog.Message.CompletedCloseDialog()
);

const pressedEscapeOnRename = DialogsExample.Message.GotRenameDialogMessage({
  message: Dialog.Message.GotDialogMessage({
    message: UiDialog.Message.RequestedClose(),
  }),
});

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  DialogsExample.Message.CompletedAnnounce()
);

describe("Dialogs example", () => {
  it("changes nothing for a close while the save or the delete runs", () => {
    const init = DialogsExample.init();
    Story.story(
      DialogsExample.update,
      Story.given({
        ...init,
        renameDialog: Dialog.open(init.renameDialog).model,
        isRenaming: true,
        deleteConfirm: ConfirmDialog.open(init.deleteConfirm).model,
        fileState: "Deleting",
      }),
      Story.message(pressedEscapeOnRename),
      Story.message(
        DialogsExample.Message.GotDeleteConfirmMessage({
          message: ConfirmDialog.Message.ClickedCancel(),
        })
      ),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(Dialog.isOpen(model.renameDialog)).toBe(true);
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(true);
      })
    );
  });

  it("renames the file, the dialog open until the save lands", () => {
    Story.story(
      DialogsExample.update,
      Story.given(DialogsExample.init()),
      Story.message(DialogsExample.Message.ClickedRename()),
      resolveShow,
      Story.message(
        DialogsExample.Message.UpdatedDraftName({ value: "  garden-notes.md " })
      ),
      Story.message(DialogsExample.Message.SubmittedRename()),
      Story.Command.expectExact(
        Focus.Focus({ id: "rename-file-form-submit" }),
        DialogsExample.SaveRename({ name: "garden-notes.md" })
      ),
      Story.Command.resolve(
        Focus.Focus,
        DialogsExample.Message.CompletedFocus()
      ),
      Story.model((model) => {
        expect(model.isRenaming).toBe(true);
        expect(Dialog.isOpen(model.renameDialog)).toBe(true);
      }),
      Story.Command.resolve(
        DialogsExample.SaveRename,
        DialogsExample.Message.SucceededSaveRename()
      ),
      Story.Command.expectExact(
        UiDialog.CloseDialog,
        Announcer.Announce({ text: "Renamed to garden-notes.md." })
      ),
      resolveClose,
      resolveAnnounce,
      Story.model((model) => {
        expect(model.fileName).toBe("garden-notes.md");
        expect(model.isRenaming).toBe(false);
        expect(Dialog.isOpen(model.renameDialog)).toBe(false);
      })
    );
  });

  it("frees the dialog's ways out when the save fails, with the reason on the field", () => {
    Story.story(
      DialogsExample.update,
      Story.given(DialogsExample.init()),
      Story.message(DialogsExample.Message.ClickedRename()),
      resolveShow,
      Story.message(
        DialogsExample.Message.UpdatedDraftName({ value: "notes/field.md" })
      ),
      Story.message(DialogsExample.Message.SubmittedRename()),
      Story.Command.resolve(
        Focus.Focus,
        DialogsExample.Message.CompletedFocus()
      ),
      Story.Command.resolve(
        DialogsExample.SaveRename,
        DialogsExample.Message.FailedSaveRename({
          reason: "A name cannot hold a slash (sample).",
        })
      ),
      Story.Command.expectExact(Focus.Focus({ id: "rename-file-name" })),
      Story.Command.resolve(
        Focus.Focus,
        DialogsExample.Message.CompletedFocus()
      ),
      Story.model((model) => {
        expect(model.isRenaming).toBe(false);
        expect(model.maybeRenameError).toStrictEqual(
          Option.some("A name cannot hold a slash (sample).")
        );
        expect(Dialog.isOpen(model.renameDialog)).toBe(true);
      }),
      Story.message(pressedEscapeOnRename),
      resolveClose,
      Story.model((model) => {
        expect(Dialog.isOpen(model.renameDialog)).toBe(false);
      })
    );
  });

  it("sends nothing for a name that is blank or the same", () => {
    Story.story(
      DialogsExample.update,
      Story.given(DialogsExample.init()),
      Story.message(DialogsExample.Message.ClickedRename()),
      resolveShow,
      Story.message(DialogsExample.Message.SubmittedRename()),
      Story.message(DialogsExample.Message.UpdatedDraftName({ value: "   " })),
      Story.message(DialogsExample.Message.SubmittedRename()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.isRenaming).toBe(false);
      })
    );
  });

  it("deletes the file once confirmed, says so, and restores it", () => {
    Story.story(
      DialogsExample.update,
      Story.given(DialogsExample.init()),
      Story.message(DialogsExample.Message.ClickedDelete()),
      resolveShow,
      Story.message(
        DialogsExample.Message.GotDeleteConfirmMessage({
          message: ConfirmDialog.Message.ClickedConfirm(),
        })
      ),
      Story.Command.expectExact(DialogsExample.WaitForDelete()),
      Story.model((model) => {
        expect(model.fileState).toBe("Deleting");
      }),
      Story.Command.resolve(
        DialogsExample.WaitForDelete,
        DialogsExample.Message.CompletedWaitForDelete()
      ),
      Story.Command.expectExact(
        UiDialog.CloseDialog,
        Announcer.Announce({ text: "Deleted field-notes.md (sample)." })
      ),
      resolveClose,
      resolveAnnounce,
      Story.model((model) => {
        expect(model.fileState).toBe("Deleted");
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(false);
      }),
      Story.message(DialogsExample.Message.ClickedRestore()),
      Story.model((model) => {
        expect(model.fileState).toBe("Present");
      })
    );
  });
});
