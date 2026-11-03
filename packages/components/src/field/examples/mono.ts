import { Field } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ name: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { name: "field-notes.md" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedName: ({ value }) => ({ model: { name: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Field.view(
    {
      id: "field-mono-name",
      label: "Name",
      value: model.name,
      onInput: (value) => Message.UpdatedName({ value }),
      help: "The name it is listed under. Its contents stay as they are.",
      isMono: true,
    },
    h
  );
