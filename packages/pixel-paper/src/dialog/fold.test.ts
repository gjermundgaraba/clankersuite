import { Dialog as UiDialog } from "@foldkit/ui";
import { Schema } from "effect";
import { Story } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { describe, expect, it } from "vite-plus/test";

import * as ConfirmDialog from "../confirm-dialog/confirm-dialog.ts";
import * as Dialog from "./dialog.ts";
import { foldDialog } from "./fold.ts";

const Model = Schema.Struct({ dialog: Dialog.Model, saves: Schema.Finite });

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  ClickedOpen: {},
  SubmittedForm: {},
});

type Message = typeof Message.Type;

const OutMessage = defineMessageUnion({ Dismissed: {} });

type OutMessage = typeof OutMessage.Type;

const fold = {
  read: (model: Model) => model.dialog,
  write: (model: Model, nextDialog: Dialog.Model): Model =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: (message: Dialog.Message): Message =>
    Message.GotDialogMessage({ message }),
};

const requestedClose = Dialog.Message.GotDialogMessage({
  message: UiDialog.Message.RequestedClose(),
});

const closed: Model = { dialog: Dialog.init({ id: "rename" }), saves: 0 };

describe("foldDialog", () => {
  it("lifts the dialog's update, open and close into a parent that hears none of its reports", () => {
    const dialogFold = foldDialog(Dialog, fold);

    const update = (model: Model, message: Message) =>
      Message.match<Update.Return<Model, Message>>(message, {
        GotDialogMessage: ({ message: dialogMessage }) =>
          dialogFold.update(model, dialogMessage),
        ClickedOpen: () => dialogFold.open(model),
        SubmittedForm: () =>
          Update.combine(model, [
            dialogFold.close,
            (stepModel) => ({
              model: modifyFields(stepModel, { saves: (saves) => saves + 1 }),
            }),
          ]),
      });

    Story.story(
      update,
      Story.given(closed),
      Story.message(Message.ClickedOpen()),
      Story.model((model) => {
        expect(Dialog.isOpen(model.dialog)).toBe(true);
      }),
      Story.Command.expectHas(UiDialog.ShowDialog),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.message(Message.SubmittedForm()),
      Story.model((model) => {
        expect(Dialog.isOpen(model.dialog)).toBe(false);
        expect(model.saves).toBe(1);
      }),
      Story.Command.expectHas(UiDialog.CloseDialog),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.message(Message.ClickedOpen()),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.message(Message.GotDialogMessage({ message: requestedClose })),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(Dialog.isOpen(model.dialog)).toBe(false);
      }),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("reports only what the dialog reports from its own update, where the parent maps it", () => {
    const dialogFold = foldDialog(Dialog, {
      ...fold,
      toParentOutMessage: Dialog.OutMessage.match<OutMessage>({
        Closed: () => OutMessage.Dismissed(),
      }),
    });

    const update = (model: Model, message: Message) =>
      Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
        message,
        {
          GotDialogMessage: ({ message: dialogMessage }) =>
            dialogFold.update(model, dialogMessage),
          ClickedOpen: () => dialogFold.open(model),
          SubmittedForm: () => dialogFold.close(model),
        }
      );

    Story.story(
      update,
      Story.given(closed),
      Story.message(Message.ClickedOpen()),
      Story.expectNoOutMessage(),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.message(Message.GotDialogMessage({ message: requestedClose })),
      Story.expectOutMessage(OutMessage.Dismissed()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.message(Message.ClickedOpen()),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      ),
      Story.message(Message.SubmittedForm()),
      Story.expectNoOutMessage(),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("folds a ConfirmDialog's opening and closing the same way", () => {
    const ConfirmMessage = defineMessageUnion({
      GotConfirmMessage: { message: ConfirmDialog.Message },
    });

    type ConfirmMessage = typeof ConfirmMessage.Type;

    const confirmFold = foldDialog(ConfirmDialog, {
      read: (model: ConfirmDialog.Model) => model,
      write: (_model: ConfirmDialog.Model, next: ConfirmDialog.Model) => next,
      toParentMessage: (message: ConfirmDialog.Message): ConfirmMessage =>
        ConfirmMessage.GotConfirmMessage({ message }),
    });

    const opened = confirmFold.open(ConfirmDialog.init({ id: "delete" }));
    const reclosed = confirmFold.close(opened.model);

    expect(ConfirmDialog.isOpen(opened.model)).toBe(true);
    expect(ConfirmDialog.isOpen(reclosed.model)).toBe(false);
  });
});
