import {
  Announcer,
  DropZone,
  FlashWord,
  LiveRegion,
} from "@gjermundgaraba/components";
import { Effect, Option, Schema } from "effect";
import { Command, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  dropZone: DropZone.Model,
  maybeReceivedWord: Schema.Option(Schema.String),
  receivedCount: Schema.Finite,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDropZoneMessage: { message: DropZone.Message },
  CompletedAnnounce: {},
  CompletedWaitBeforeClear: { count: Schema.Finite },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    dropZone: DropZone.init({ id: "drop-zone-upload" }),
    maybeReceivedWord: Option.none(),
    receivedCount: 0,
  },
});

export const WaitBeforeClear = Command.define("WaitBeforeClear", {
  args: { count: Schema.Finite },
  messages: [Message.CompletedWaitBeforeClear],
  execute: ({ count }) =>
    Effect.sleep(FlashWord.HOLD).pipe(
      Effect.as(Message.CompletedWaitBeforeClear({ count }))
    ),
});

const filesWord = (count: number): string =>
  count === 1 ? "1 file" : `${count} files`;

const showReceived = (
  model: Model,
  fileCount: number
): Update.Return<Model, Message> => {
  const count = model.receivedCount + 1;

  return {
    model: modifyFields(model, {
      maybeReceivedWord: () => Option.some(`${filesWord(fileCount)} received`),
      receivedCount: () => count,
    }),
    commands: [WaitBeforeClear({ count })],
  };
};

const foldDropZone = Update.foldChild({
  update: DropZone.update,
  read: (model: Model) => Option.some(model.dropZone),
  write: (model: Model, dropZone: DropZone.Model): Model =>
    modifyFields(model, { dropZone: () => dropZone }),
  toParentMessage: (message: DropZone.Message) =>
    Message.GotDropZoneMessage({ message }),
  foldOutMessage: DropZone.OutMessage.match<Update.Step<Model, Message>>({
    ReceivedFiles:
      ({ files }) =>
      (model) =>
        showReceived(model, files.length),
    RejectedNonFiles: () => (model) => ({
      model,
      commands: [
        Announcer.Announce({ text: "Only files can be dropped here." }),
      ],
    }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDropZoneMessage: ({ message: dropZoneMessage }) =>
      foldDropZone(model, dropZoneMessage),
    CompletedAnnounce: () => ({ model }),
    CompletedWaitBeforeClear: ({ count }) => ({
      model:
        count === model.receivedCount
          ? modifyFields(model, { maybeReceivedWord: () => Option.none() })
          : model,
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: DropZone.id(model.dropZone),
        model: model.dropZone,
        view: DropZone.view,
        viewInputs: {
          title: "Drop files here",
          body: ["They are counted and put nowhere."],
          toStatusView: () => [
            FlashWord.view({ maybeWord: model.maybeReceivedWord }, h),
          ],
        },
        toParentMessage: (message) => Message.GotDropZoneMessage({ message }),
      }),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
