import {
  Announcer,
  Button,
  Card,
  Dialog,
  Field,
  Focus,
  Group,
  LiveRegion,
} from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema, String, pipe } from "effect";
import { Command, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  renameDialog: Dialog.Model,
  fileName: Schema.String,
  draftName: Schema.String,
  isRenaming: Schema.Boolean,
  maybeRenameError: Schema.Option(Schema.String),
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
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

const FILE_NAME = "field-notes.md";
const RENAME_FORM_ID = "rename-file-form";
const RENAME_FIELD_ID = "rename-file-name";
const SAVE_TIME = Duration.millis(1200);
const SAVE_TIMEOUT = Duration.seconds(10);

export const init = (): Update.Return<Model, Message> => ({
  model: {
    renameDialog: Dialog.init({ id: "rename-file" }),
    fileName: FILE_NAME,
    draftName: FILE_NAME,
    isRenaming: false,
    maybeRenameError: Option.none(),
  },
});

export const SaveRename = Command.define("SaveRename", {
  args: { name: Schema.String },
  messages: [Message.SucceededSaveRename, Message.FailedSaveRename],
  execute: ({ name }) =>
    Effect.sleep(SAVE_TIME).pipe(
      Effect.as(
        String.includes("/")(name)
          ? Message.FailedSaveRename({ reason: "A name cannot hold a slash." })
          : Message.SucceededSaveRename()
      ),
      Effect.timeoutOrElse({
        duration: SAVE_TIMEOUT,
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
  write: (model: Model, renameDialog: Dialog.Model): Model =>
    modifyFields(model, { renameDialog: () => renameDialog }),
  toParentMessage: (message: Dialog.Message): Message =>
    Message.GotRenameDialogMessage({ message }),
  isCloseHeld: (model: Model) => model.isRenaming,
});

const maybeNewName = (model: Model): Option.Option<string> =>
  pipe(
    model.draftName,
    String.trim,
    Option.liftPredicate(
      (name) => String.isNonEmpty(name) && name !== model.fileName
    )
  );

const renamed = (model: Model): Model =>
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
        renamed(modifyFields(model, { isRenaming: () => false })),
        [
          renameDialogFold.close,
          (renamedModel) => ({
            model: renamedModel,
            commands: [
              Announcer.Announce({
                text: `Renamed to ${renamedModel.fileName}.`,
              }),
            ],
          }),
        ]
      ),
    CompletedFocus: () => ({ model }),
    CompletedAnnounce: () => ({ model }),
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place(
    [["Rename", Dialog.isOpen(model.renameDialog)]],
    () => LiveRegion.view({}, h)
  );

  return h.div(
    [],
    [
      Group.view(
        {
          body: [
            h.span([], [model.fileName]),
            Button.view(
              {
                label: "rename",
                glyph: "pencil",
                onClick: Message.ClickedRename(),
              },
              h
            ),
          ],
        },
        h
      ),
      h.submodel({
        slotId: Dialog.id(model.renameDialog),
        model: model.renameDialog,
        view: Dialog.view,
        viewInputs: {
          toLiveRegionView: liveRegion.toDialogView("Rename"),
          toView: (render) => renameCardView(model, render, h),
        },
        toParentMessage: (message) =>
          Message.GotRenameDialogMessage({ message }),
      }),
      ...liveRegion.toPageView(),
    ]
  );
};
