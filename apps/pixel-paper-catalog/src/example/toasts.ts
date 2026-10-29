import { Button, Toast } from "@gjermundgaraba/pixel-paper";
import { Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  toasts: Toast.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedArchive: {},
  ClickedSync: {},
  ClickedSave: {},
  GotToastsMessage: { message: Toast.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  toasts: Toast.init({ id: "page-toasts" }),
});

type UpdateReturn = Update.Return<Model, Message>;

const toastsFold = {
  read: (model: Model) => Option.some(model.toasts),
  write: (model: Model, nextToasts: Toast.Model): Model =>
    modifyFields(model, { toasts: () => nextToasts }),
  toParentMessage: (message: Toast.Message) =>
    Message.GotToastsMessage({ message }),
};

export const show: (model: Model, config: Toast.ShowConfig) => UpdateReturn =
  Update.foldChild({
    update: Toast.show,
    ...toastsFold,
  });

const foldToasts = Update.foldChild({
  update: Toast.update,
  ...toastsFold,
});

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedArchive: () =>
      show(model, {
        tone: "Ok",
        title: "Moved to archive",
        body: "field-notes.md (sample)",
      }),
    ClickedSync: () =>
      show(model, {
        tone: "Quiet",
        title: "Synced",
        body: "3 changes from your phone (sample).",
      }),
    ClickedSave: () =>
      show(model, {
        tone: "Error",
        title: "Could not save",
        body: "The connection dropped. It stays until dismissed (sample).",
      }),
    GotToastsMessage: ({ message: toastsMessage }) =>
      foldToasts(model, toastsMessage),
  });

export const stackView = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.submodel({
    slotId: Toast.id(model.toasts),
    model: model.toasts,
    view: Toast.view,
    toParentMessage: (message) =>
      toParentMessage(Message.GotToastsMessage({ message })),
  });

export const view = defineView<Model, Message>((_model, h): Html =>
  rowView(
    [
      specView(
        "ok leaves after the hold",
        [
          Button.view(
            {
              label: "archive",
              glyph: "box",
              onClick: Message.ClickedArchive(),
            },
            h
          ),
        ],
        h
      ),
      specView(
        "quiet news",
        [
          Button.view(
            { label: "sync", glyph: "sync", onClick: Message.ClickedSync() },
            h
          ),
        ],
        h
      ),
      specView(
        "an error stays until dismissed",
        [
          Button.view(
            { label: "save", glyph: "save", onClick: Message.ClickedSave() },
            h
          ),
        ],
        h
      ),
    ],
    h
  )
);
