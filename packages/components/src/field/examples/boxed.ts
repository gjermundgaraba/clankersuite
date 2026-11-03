import { Field, Stack } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  address: Schema.String,
  due: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedAddress: { value: Schema.String },
  UpdatedDue: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { address: "", due: "2026-11-20" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedAddress: ({ value }) => ({
      model: modifyFields(model, { address: () => value }),
    }),
    UpdatedDue: ({ value }) => ({
      model: modifyFields(model, { due: () => value }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Field.view(
          {
            id: "field-boxed-address",
            label: "Address",
            value: model.address,
            onInput: (value) => Message.UpdatedAddress({ value }),
            isBoxed: true,
          },
          h
        ),
        Field.view(
          {
            id: "field-boxed-due",
            label: "Due",
            value: model.due,
            onInput: (value) => Message.UpdatedDue({ value }),
            type: "date",
          },
          h
        ),
      ],
    },
    h
  );
