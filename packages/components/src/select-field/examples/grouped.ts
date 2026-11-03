import { SelectField } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ kind: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ChangedKind: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { kind: "internal" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedKind: ({ value }) => ({ model: { kind: value } }),
  });

const KIND_OPTIONS: SelectField.ViewConfig<Message>["options"] = [
  { value: "internal", label: "Internal" },
  {
    key: "client",
    label: "Client work",
    options: [
      { value: "retainer", label: "Retainer" },
      { value: "fixed", label: "Fixed price" },
      { value: "pilot", label: "Pilot (full this quarter)", isDisabled: true },
    ],
  },
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  SelectField.view(
    {
      id: "select-field-kind",
      label: "Kind",
      value: model.kind,
      onChange: (value) => Message.ChangedKind({ value }),
      options: KIND_OPTIONS,
      help: "Client work is billed; internal work is not.",
    },
    h
  );
