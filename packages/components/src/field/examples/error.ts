import { Field } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ project: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedProject: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { project: "" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedProject: ({ value }) => ({ model: { project: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Field.view(
    {
      id: "field-error-project",
      label: "Project",
      value: model.project,
      onInput: (value) => Message.UpdatedProject({ value }),
      help: "The name the team will know it by.",
      error: "Enter the project's name.",
      isRequired: true,
    },
    h
  );
