import { TextareaField } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ notes: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedNotes: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { notes: "" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedNotes: ({ value }) => ({ model: { notes: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  TextareaField.view(
    {
      id: "textarea-field-notes",
      label: "Notes",
      value: model.notes,
      onInput: (value) => Message.UpdatedNotes({ value }),
      help: "What the team should know first.",
      rows: 3,
    },
    h
  );
