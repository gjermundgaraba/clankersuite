import {
  Button,
  Focus,
  Group,
  InlineInput,
  Rows,
  Stack,
} from "@gjermundgaraba/components";
import { Array, Duration, Effect, Option, Schema, String } from "effect";
import { Command, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({ id: Schema.String, title: Schema.String })
  ),
  maybeAdding: Schema.Option(InlineInput.Model),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedAdd: {},
  GotAddingMessage: { message: InlineInput.Message },
  CompletedSaveItem: { text: Schema.String },
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

export const ADD_ID = "inline-input-add";
export const ADD_BUTTON_ID = "inline-input-add-button";

export const init = (): Update.Return<Model, Message> => ({
  model: {
    items: [{ id: "item-0", title: "Renew the certificate" }],
    maybeAdding: Option.none(),
  },
});

export const SaveItem = Command.define("SaveItem", {
  args: { text: Schema.String },
  messages: [Message.CompletedSaveItem],
  execute: ({ text }) =>
    Effect.sleep(Duration.millis(250)).pipe(
      Effect.as(Message.CompletedSaveItem({ text }))
    ),
});

type UpdateReturn = Update.Return<Model, Message>;

const foldAddingOutMessage = InlineInput.OutMessage.match<
  Update.Step<Model, Message>
>({
  Committed:
    ({ text }) =>
    (model) => ({ model, commands: [SaveItem({ text })] }),
  Ended:
    ({ how }) =>
    (model) => ({
      model: modifyFields(model, { maybeAdding: () => Option.none() }),
      commands: Array.fromOption(
        Option.liftPredicate(
          Focus.Focus({ id: ADD_BUTTON_ID }),
          () => how !== "Blur"
        )
      ),
    }),
});

const addingFold = {
  read: (model: Model) => model.maybeAdding,
  write: (model: Model, nextAdding: InlineInput.Model): Model =>
    modifyFields(model, { maybeAdding: () => Option.some(nextAdding) }),
  toParentMessage: (message: InlineInput.Message) =>
    Message.GotAddingMessage({ message }),
  foldOutMessage: foldAddingOutMessage,
};

const foldAdding = Update.foldChild({
  update: InlineInput.update,
  ...addingFold,
});

const foldAddingFailed = Update.foldChild({
  update: InlineInput.failed,
  ...addingFold,
});

const foldAddingSucceeded = Update.foldChild({
  update: InlineInput.succeeded,
  ...addingFold,
});

const startAdding = (model: Model): UpdateReturn =>
  Option.isSome(model.maybeAdding)
    ? { model }
    : Update.foldChildInit(
        InlineInput.init({ id: ADD_ID, isRepeating: true }),
        {
          toParentModel: (adding) =>
            modifyFields(model, { maybeAdding: () => Option.some(adding) }),
          toParentMessage: (message) => Message.GotAddingMessage({ message }),
        }
      );

const isListed = (model: Model, text: string): boolean =>
  Array.some(
    model.items,
    (item) => String.toLowerCase(item.title) === String.toLowerCase(text)
  );

const saveItem = (model: Model, text: string): UpdateReturn => {
  if (isListed(model, text)) {
    return foldAddingFailed(model, `${text} is already on the list.`);
  }

  const item = { id: `item-${model.items.length}`, title: text };

  return foldAddingSucceeded(
    modifyFields(model, { items: Array.append(item) }),
    item.id
  );
};

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedAdd: () => startAdding(model),
    GotAddingMessage: ({ message: addingMessage }) =>
      foldAdding(model, addingMessage),
    CompletedSaveItem: ({ text }) => saveItem(model, text),
    CompletedFocus: () => ({ model }),
  });

const addingView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Option.match(model.maybeAdding, {
    onNone: () => [],
    onSome: (adding) => [
      Rows.rowView(
        {
          key: ADD_ID,
          body: [
            h.submodel({
              slotId: ADD_ID,
              model: adding,
              view: InlineInput.view,
              viewInputs: {
                value: "",
                label: "New item",
                placeholder: "an item, then enter",
              },
              toParentMessage: (message) =>
                Message.GotAddingMessage({ message }),
            }),
            InlineInput.errorView(adding, h),
          ],
        },
        h
      ),
    ],
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Rows.view(
          {
            label: "Items",
            rows: [
              ...Array.map(model.items, (item) =>
                Rows.rowView({ key: item.id, body: [item.title] }, h)
              ),
              ...addingView(model, h),
            ],
          },
          h
        ),
        Group.view(
          {
            body: [
              Button.view(
                {
                  label: "add item",
                  glyph: "plus",
                  isSmall: true,
                  onClick: Message.ClickedAdd(),
                  attributes: [h.Id(ADD_BUTTON_ID)],
                },
                h
              ),
            ],
          },
          h
        ),
      ],
    },
    h
  );
