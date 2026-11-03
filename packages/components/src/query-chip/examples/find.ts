import { QueryChip } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ query: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { query: "" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedQuery: ({ value }) => ({ model: { query: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  QueryChip.view(
    {
      id: "query-chip-find",
      label: "find",
      value: model.query,
      onInput: (value) => Message.UpdatedQuery({ value }),
      placeholder: "words in a title",
    },
    h
  );
