import { Field } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ owner: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedOwner: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { owner: "" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedOwner: ({ value }) => ({ model: { owner: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Field.view(
    {
      id: "field-help-owner",
      label: "Owner",
      value: model.owner,
      onInput: (value) => Message.UpdatedOwner({ value }),
      help: "Leave it empty to own it yourself.",
    },
    h
  );
