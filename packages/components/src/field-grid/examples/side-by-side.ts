import { Field, FieldGrid } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  project: Schema.String,
  owner: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedProject: { value: Schema.String },
  UpdatedOwner: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { project: "", owner: "" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedProject: ({ value }) => ({
      model: modifyFields(model, { project: () => value }),
    }),
    UpdatedOwner: ({ value }) => ({
      model: modifyFields(model, { owner: () => value }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  FieldGrid.view(
    {
      body: [
        Field.view(
          {
            id: "field-grid-project",
            label: "Project",
            value: model.project,
            onInput: (value) => Message.UpdatedProject({ value }),
            isRequired: true,
          },
          h
        ),
        Field.view(
          {
            id: "field-grid-owner",
            label: "Owner",
            value: model.owner,
            onInput: (value) => Message.UpdatedOwner({ value }),
            help: "Leave it empty to own it yourself.",
          },
          h
        ),
      ],
    },
    h
  );
