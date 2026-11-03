import {
  Announcer,
  Button,
  ConfirmDialog,
  Group,
  LiveRegion,
  Notice,
} from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema } from "effect";
import { Command, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  deleteConfirm: ConfirmDialog.Model,
  fileName: Schema.String,
  fileState: Schema.Literals(["Present", "Deleting", "Deleted"]),
  maybeDeleteError: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedDelete: {},
  GotDeleteConfirmMessage: { message: ConfirmDialog.Message },
  SucceededDelete: {},
  FailedDelete: { reason: Schema.String },
  ClickedRestore: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    deleteConfirm: ConfirmDialog.init({ id: "delete-file" }),
    fileName: "budget.csv",
    fileState: "Present",
    maybeDeleteError: Option.none(),
  },
});

const DELETE_TIME = Duration.millis(1200);
const DELETE_TIMEOUT = Duration.seconds(10);

export const Delete = Command.define("Delete", {
  messages: [Message.SucceededDelete, Message.FailedDelete],
  execute: Effect.sleep(DELETE_TIME).pipe(
    Effect.as(Message.SucceededDelete()),
    Effect.timeoutOrElse({
      duration: DELETE_TIMEOUT,
      orElse: () =>
        Effect.succeed(
          Message.FailedDelete({
            reason: "The delete took too long. Try again.",
          })
        ),
    })
  ),
});

const isDeleting = (model: Model): boolean => model.fileState === "Deleting";

const deleteConfirmFold = {
  read: (model: Model) => Option.some(model.deleteConfirm),
  write: (model: Model, deleteConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { deleteConfirm: () => deleteConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotDeleteConfirmMessage({ message }),
  foldOutMessage: ConfirmDialog.OutMessage.match<Update.Step<Model, Message>>({
    Confirmed: () => (model) => ({
      model: modifyFields(model, {
        fileState: () => "Deleting",
        maybeDeleteError: () => Option.none(),
      }),
      commands: [Delete()],
    }),
    Cancelled: () => (model) => ({ model }),
  }),
};

const foldDeleteConfirm = (model: Model, message: ConfirmDialog.Message) =>
  Update.foldChild({
    update: (
      deleteConfirm: ConfirmDialog.Model,
      confirmMessage: ConfirmDialog.Message
    ) =>
      ConfirmDialog.update(deleteConfirm, confirmMessage, {
        isCloseHeld: isDeleting(model),
      }),
    ...deleteConfirmFold,
  })(model, message);

const openDeleteConfirm = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...deleteConfirmFold,
});

const closeDeleteConfirm = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...deleteConfirmFold,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDelete: () => openDeleteConfirm(model),
    GotDeleteConfirmMessage: ({ message: confirmMessage }) =>
      foldDeleteConfirm(model, confirmMessage),
    SucceededDelete: () =>
      isDeleting(model)
        ? Update.combine(modifyFields(model, { fileState: () => "Deleted" }), [
            closeDeleteConfirm,
            (deletedModel) => ({
              model: deletedModel,
              commands: [
                Announcer.Announce({
                  text: `Deleted ${deletedModel.fileName}.`,
                }),
              ],
            }),
          ])
        : { model },
    FailedDelete: ({ reason }) => ({
      model: modifyFields(model, {
        fileState: () => "Present",
        maybeDeleteError: () => Option.some(reason),
      }),
    }),
    ClickedRestore: () => ({
      model: modifyFields(model, { fileState: () => "Present" }),
    }),
    CompletedAnnounce: () => ({ model }),
  });

const fileView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.fileState === "Deleted"
    ? Group.view(
        {
          body: [
            h.span([], [`${model.fileName} is gone`]),
            Button.view(
              { label: "restore", onClick: Message.ClickedRestore() },
              h
            ),
          ],
        },
        h
      )
    : Group.view(
        {
          body: [
            h.span([], [model.fileName]),
            Button.view(
              {
                label: "delete",
                glyph: "trash",
                onClick: Message.ClickedDelete(),
              },
              h
            ),
          ],
        },
        h
      );

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place(
    [["Delete", ConfirmDialog.isOpen(model.deleteConfirm)]],
    () => LiveRegion.view({}, h)
  );

  return h.div(
    [],
    [
      fileView(model, h),
      h.submodel({
        slotId: ConfirmDialog.id(model.deleteConfirm),
        model: model.deleteConfirm,
        view: ConfirmDialog.view,
        viewInputs: {
          title: "Delete",
          question: "Delete this file?",
          body: [
            `${model.fileName} goes from every device, and it cannot be undone.`,
          ],
          label: "delete",
          isDanger: true,
          isBusy: isDeleting(model),
          toDetailView: () =>
            Option.match(model.maybeDeleteError, {
              onNone: () => [],
              onSome: (reason) => [
                Notice.view({ tone: "Error", body: [reason] }, h),
              ],
            }),
          toLiveRegionView: liveRegion.toDialogView("Delete"),
        },
        toParentMessage: (message) =>
          Message.GotDeleteConfirmMessage({ message }),
      }),
      ...liveRegion.toPageView(),
    ]
  );
};
