import { Dialog as UiDialog } from "@foldkit/ui";
import { Announcer, Dialog, Focus } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { Message, SaveRename, init, update } from "./rename.ts";

const resolveShow = Story.Command.resolve(
  UiDialog.ShowDialog,
  UiDialog.Message.SucceededShowDialog()
);

const resolveClose = Story.Command.resolve(
  UiDialog.CloseDialog,
  UiDialog.Message.CompletedCloseDialog()
);

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  Message.CompletedFocus()
);

const pressedEscape = Message.GotRenameDialogMessage({
  message: Dialog.Message.GotDialogMessage({
    message: UiDialog.Message.RequestedClose(),
  }),
});

const SLASH = "A name cannot hold a slash.";

describe("the rename example", () => {
  it("renames the file, the dialog open until the save lands", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedRename()),
      resolveShow,
      Story.message(Message.UpdatedDraftName({ value: "  garden-notes.md " })),
      Story.message(Message.SubmittedRename()),
      Story.Command.expectExact(
        Focus.Focus({ id: "rename-file-form-submit" }),
        SaveRename({ name: "garden-notes.md" })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.isRenaming).toBe(true);
        expect(Dialog.isOpen(model.renameDialog)).toBe(true);
      }),
      Story.Command.resolve(SaveRename, Message.SucceededSaveRename()),
      Story.Command.expectExact(
        UiDialog.CloseDialog,
        Announcer.Announce({ text: "Renamed to garden-notes.md." })
      ),
      resolveClose,
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce()),
      Story.model((model) => {
        expect(model.fileName).toBe("garden-notes.md");
        expect(model.isRenaming).toBe(false);
        expect(Dialog.isOpen(model.renameDialog)).toBe(false);
      })
    );
  });

  it("changes nothing for Escape while the save runs", () => {
    const init_ = init();

    Story.story(
      update,
      Story.given(
        modifyFields(init_.model, {
          renameDialog: (renameDialog) => Dialog.open(renameDialog).model,
          isRenaming: () => true,
        })
      ),
      Story.message(pressedEscape),
      Story.Command.expectNone(),
      Story.model((heldModel) => {
        expect(Dialog.isOpen(heldModel.renameDialog)).toBe(true);
      })
    );
  });

  it("frees the dialog's ways out when the save fails, with the reason on the field", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedRename()),
      resolveShow,
      Story.message(Message.UpdatedDraftName({ value: "notes/field.md" })),
      Story.message(Message.SubmittedRename()),
      resolveFocus,
      Story.Command.resolve(
        SaveRename,
        Message.FailedSaveRename({ reason: SLASH })
      ),
      Story.Command.expectExact(Focus.Focus({ id: "rename-file-name" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.isRenaming).toBe(false);
        expect(model.maybeRenameError).toStrictEqual(Option.some(SLASH));
        expect(Dialog.isOpen(model.renameDialog)).toBe(true);
      }),
      Story.message(pressedEscape),
      resolveClose,
      Story.model((model) => {
        expect(Dialog.isOpen(model.renameDialog)).toBe(false);
      })
    );
  });

  it("sends nothing for a name that is blank or the same", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedRename()),
      resolveShow,
      Story.message(Message.SubmittedRename()),
      Story.message(Message.UpdatedDraftName({ value: "   " })),
      Story.message(Message.SubmittedRename()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.isRenaming).toBe(false);
      })
    );
  });
});
