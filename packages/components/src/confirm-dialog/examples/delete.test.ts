import { Dialog as UiDialog } from "@foldkit/ui";
import { Announcer, ConfirmDialog } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { Delete, Message, init, update } from "./delete.ts";

const confirmed = Message.GotDeleteConfirmMessage({
  message: ConfirmDialog.Message.ClickedConfirm(),
});

const resolveShow = Story.Command.resolve(
  UiDialog.ShowDialog,
  UiDialog.Message.SucceededShowDialog()
);

describe("the delete example", () => {
  it("deletes the file once confirmed, says so, and restores it", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedDelete()),
      resolveShow,
      Story.message(confirmed),
      Story.Command.expectExact(Delete()),
      Story.model((model) => {
        expect(model.fileState).toBe("Deleting");
      }),
      Story.Command.resolve(Delete, Message.SucceededDelete()),
      Story.Command.expectExact(
        UiDialog.CloseDialog,
        Announcer.Announce({ text: "Deleted budget.csv." })
      ),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce()),
      Story.model((model) => {
        expect(model.fileState).toBe("Deleted");
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(false);
      }),
      Story.message(Message.ClickedRestore()),
      Story.model((model) => {
        expect(model.fileState).toBe("Present");
      })
    );
  });

  it("changes nothing for cancel while the delete runs", () => {
    const init_ = init();

    Story.story(
      update,
      Story.given(
        modifyFields(init_.model, {
          deleteConfirm: (deleteConfirm) =>
            ConfirmDialog.open(deleteConfirm).model,
          fileState: () => "Deleting",
        })
      ),
      Story.message(
        Message.GotDeleteConfirmMessage({
          message: ConfirmDialog.Message.ClickedCancel(),
        })
      ),
      Story.Command.expectNone(),
      Story.model((heldModel) => {
        expect(ConfirmDialog.isOpen(heldModel.deleteConfirm)).toBe(true);
      })
    );
  });

  it("keeps the confirm open with the reason when the delete fails", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedDelete()),
      resolveShow,
      Story.message(confirmed),
      Story.Command.resolve(
        Delete,
        Message.FailedDelete({ reason: "The delete took too long. Try again." })
      ),
      Story.model((model) => {
        expect(model.fileState).toBe("Present");
        expect(model.maybeDeleteError).toStrictEqual(
          Option.some("The delete took too long. Try again.")
        );
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(true);
      })
    );
  });
});
