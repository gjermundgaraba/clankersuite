import {
  Announcer,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  Field,
  Focus,
} from "@gjermundgaraba/pixel-paper";
import { Duration, Effect, Option, Schema, String, pipe } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  renameDialog: Dialog.Model,
  fileName: Schema.String,
  draftName: Schema.String,
  isRenaming: Schema.Boolean,
  maybeRenameError: Schema.Option(Schema.String),
  deleteConfirm: ConfirmDialog.Model,
  fileState: Schema.Literals(["Present", "Deleting", "Deleted"]),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedRename: {},
  GotRenameDialogMessage: { message: Dialog.Message },
  UpdatedDraftName: { value: Schema.String },
  SubmittedRename: {},
  SucceededSaveRename: {},
  FailedSaveRename: { reason: Schema.String },
  CompletedFocus: {},
  ClickedDelete: {},
  GotDeleteConfirmMessage: { message: ConfirmDialog.Message },
  CompletedWaitForDelete: {},
  ClickedRestore: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

const SAMPLE_FILE_NAME = "field-notes.md";

export const init = (): Model => ({
  renameDialog: Dialog.init({ id: "rename-file" }),
  fileName: SAMPLE_FILE_NAME,
  draftName: SAMPLE_FILE_NAME,
  isRenaming: false,
  maybeRenameError: Option.none(),
  deleteConfirm: ConfirmDialog.init({ id: "delete-file" }),
  fileState: "Present",
});

const SAMPLE_DELETE_DURATION = Duration.millis(1200);
const SAMPLE_RENAME_DURATION = Duration.millis(1200);
const RENAME_TIMEOUT = Duration.seconds(10);
const RENAME_FORM_ID = "rename-file-form";
const RENAME_FIELD_ID = "rename-file-name";

export const WaitForDelete = Command.define("WaitForDelete", {
  messages: [Message.CompletedWaitForDelete],
  execute: Effect.sleep(SAMPLE_DELETE_DURATION).pipe(
    Effect.as(Message.CompletedWaitForDelete())
  ),
});

export const SaveRename = Command.define("SaveRename", {
  args: { name: Schema.String },
  messages: [Message.SucceededSaveRename, Message.FailedSaveRename],
  execute: ({ name }) =>
    Effect.sleep(SAMPLE_RENAME_DURATION).pipe(
      Effect.as(
        String.includes("/")(name)
          ? Message.FailedSaveRename({
              reason: "A name cannot hold a slash (sample).",
            })
          : Message.SucceededSaveRename()
      ),
      Effect.timeoutOrElse({
        duration: RENAME_TIMEOUT,
        orElse: () =>
          Effect.succeed(
            Message.FailedSaveRename({
              reason: "The save took too long. Try again.",
            })
          ),
      })
    ),
});

const renameDialogFold = Dialog.foldDialog(Dialog, {
  read: (model: Model) => model.renameDialog,
  write: (model: Model, nextRenameDialog: Dialog.Model): Model =>
    modifyFields(model, { renameDialog: () => nextRenameDialog }),
  toParentMessage: (message: Dialog.Message): Message =>
    Message.GotRenameDialogMessage({ message }),
  isCloseHeld: (model: Model) => model.isRenaming,
});

const isDeleting = (model: Model): boolean => model.fileState === "Deleting";

const foldDeleteConfirmOutMessage = ConfirmDialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Confirmed: () => (model) => ({
    model: modifyFields(model, { fileState: () => "Deleting" }),
    commands: [WaitForDelete()],
  }),
  Cancelled: () => (model) => ({ model }),
});

const deleteConfirmFold = {
  read: (model: Model) => Option.some(model.deleteConfirm),
  write: (model: Model, nextDeleteConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { deleteConfirm: () => nextDeleteConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotDeleteConfirmMessage({ message }),
  foldOutMessage: foldDeleteConfirmOutMessage,
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

const foldDeleteConfirmOpen = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...deleteConfirmFold,
});

const foldDeleteConfirmClose = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...deleteConfirmFold,
});

const maybeNewName = (model: Model): Option.Option<string> =>
  pipe(
    model.draftName,
    String.trim,
    Option.liftPredicate(
      (name) => String.isNonEmpty(name) && name !== model.fileName
    )
  );

const renamedTo = (model: Model): Model =>
  Option.match(maybeNewName(model), {
    onNone: () => model,
    onSome: (fileName) => modifyFields(model, { fileName: () => fileName }),
  });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedRename: () =>
      renameDialogFold.open(
        modifyFields(model, {
          draftName: () => model.fileName,
          maybeRenameError: () => Option.none(),
        })
      ),
    GotRenameDialogMessage: ({ message: dialogMessage }) =>
      renameDialogFold.update(model, dialogMessage),
    UpdatedDraftName: ({ value }) => ({
      model: modifyFields(model, {
        draftName: () => value,
        maybeRenameError: () => Option.none(),
      }),
    }),
    SubmittedRename: () =>
      Option.match(
        Option.filter(maybeNewName(model), () => !model.isRenaming),
        {
          onNone: () => ({ model }),
          onSome: (name) => ({
            model: modifyFields(model, { isRenaming: () => true }),
            commands: [
              Focus.Focus({ id: Card.submitId(RENAME_FORM_ID) }),
              SaveRename({ name }),
            ],
          }),
        }
      ),
    FailedSaveRename: ({ reason }) => ({
      model: modifyFields(model, {
        isRenaming: () => false,
        maybeRenameError: () => Option.some(reason),
      }),
      commands: [Focus.Focus({ id: RENAME_FIELD_ID })],
    }),
    SucceededSaveRename: () =>
      Update.combine(
        renamedTo(modifyFields(model, { isRenaming: () => false })),
        [
          renameDialogFold.close,
          (stepModel) => ({
            model: stepModel,
            commands: [
              Announcer.Announce({ text: `Renamed to ${stepModel.fileName}.` }),
            ],
          }),
        ]
      ),
    ClickedDelete: () => foldDeleteConfirmOpen(model),
    GotDeleteConfirmMessage: ({ message: confirmMessage }) =>
      foldDeleteConfirm(model, confirmMessage),
    CompletedWaitForDelete: () =>
      isDeleting(model)
        ? Update.combine(modifyFields(model, { fileState: () => "Deleted" }), [
            foldDeleteConfirmClose,
            (stepModel) => ({
              model: stepModel,
              commands: [
                Announcer.Announce({
                  text: `Deleted ${stepModel.fileName} (sample).`,
                }),
              ],
            }),
          ])
        : { model },
    ClickedRestore: () => ({
      model: modifyFields(model, { fileState: () => "Present" }),
    }),
    CompletedAnnounce: () => ({ model }),
    CompletedFocus: () => ({ model }),
  });

const renameCardView = (
  model: Model,
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html =>
  Card.formView(
    {
      id: RENAME_FORM_ID,
      title: "Rename",
      titleAttributes: render.title,
      isNarrow: true,
      closeAttributes: render.closeButton,
      isBusy: model.isRenaming,
      isSubmitDisabled: Option.isNone(maybeNewName(model)),
      onSubmit: Message.SubmittedRename(),
      actionBarAttributes: render.actionBar,
      cancel: "cancel",
      submit: "save",
      body: [
        Field.view(
          {
            id: RENAME_FIELD_ID,
            label: "Name",
            value: model.draftName,
            onInput: (value) => Message.UpdatedDraftName({ value }),
            help: "The name it is listed under. Its contents stay as they are.",
            error: Option.getOrUndefined(model.maybeRenameError),
            isMono: true,
            inputAttributes: render.initialFocus,
          },
          h
        ),
      ],
    },
    h
  );

const deleteView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.fileState === "Deleted"
    ? h.span(
        [h.Class("spec-inline")],
        [
          h.span(
            [h.Class("spec-caption")],
            [`${model.fileName} is gone (sample)`]
          ),
          Button.view(
            { label: "restore", onClick: Message.ClickedRestore() },
            h
          ),
        ]
      )
    : Button.view(
        { label: "delete", glyph: "trash", onClick: Message.ClickedDelete() },
        h
      );

export type ViewInputs = Readonly<{
  toLiveRegionView?: (() => Html) | undefined;
}>;

export const isDialogOpen = (model: Model): boolean =>
  Dialog.isOpen(model.renameDialog) ||
  ConfirmDialog.isOpen(model.deleteConfirm);

export const view = defineView<Model, Message, ViewInputs>(
  (model, { toLiveRegionView }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        rowView(
          [
            specView(
              `a dialog with a form: ${model.fileName} (sample); while it saves, its ways out are held, and a name with a slash is refused`,
              [
                Button.view(
                  {
                    label: "rename",
                    glyph: "pencil",
                    onClick: Message.ClickedRename(),
                  },
                  h
                ),
              ],
              h
            ),
            specView(
              "the destructive confirm: focus starts on cancel; h and l move between the actions; while it deletes, cancel, Escape and the veil are held",
              [deleteView(model, h)],
              h
            ),
          ],
          h
        ),
        h.submodel({
          slotId: Dialog.id(model.renameDialog),
          model: model.renameDialog,
          view: Dialog.view,
          viewInputs: {
            toLiveRegionView: Dialog.isOpen(model.renameDialog)
              ? toLiveRegionView
              : undefined,
            toView: (render) => renameCardView(model, render, h),
          },
          toParentMessage: (message) =>
            Message.GotRenameDialogMessage({ message }),
        }),
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
            toLiveRegionView: ConfirmDialog.isOpen(model.deleteConfirm)
              ? toLiveRegionView
              : undefined,
          },
          toParentMessage: (message) =>
            Message.GotDeleteConfirmMessage({ message }),
        }),
      ]
    )
);
