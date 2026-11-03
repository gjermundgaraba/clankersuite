import { TextareaField } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ hosts: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedHosts: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { hosts: "" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedHosts: ({ value }) => ({ model: { hosts: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  TextareaField.view(
    {
      id: "textarea-field-hosts",
      label: "Hosts",
      value: model.hosts,
      onInput: (value) => Message.UpdatedHosts({ value }),
      help: "One per line.",
      isRequired: true,
      isMono: true,
      rows: 2,
      textareaAttributes: [
        h.Placeholder("app.example.com"),
        h.Spellcheck(false),
        h.Autocapitalize("off"),
      ],
    },
    h
  );
