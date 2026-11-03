import { Choice, Fieldset } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isMailed: Schema.Boolean,
  isDaily: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledMailed: { isChecked: Schema.Boolean },
  ToggledDaily: { isChecked: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isMailed: true, isDaily: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledMailed: ({ isChecked }) => ({
      model: modifyFields(model, { isMailed: () => isChecked }),
    }),
    ToggledDaily: ({ isChecked }) => ({
      model: modifyFields(model, { isDaily: () => isChecked }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Fieldset.view(
    {
      id: "fieldset-notify",
      label: "Notify",
      body: [
        Choice.view(
          {
            id: "fieldset-notify-mailed",
            label: "by mail",
            isChecked: model.isMailed,
            onToggle: (isChecked) => Message.ToggledMailed({ isChecked }),
          },
          h
        ),
        Choice.view(
          {
            id: "fieldset-notify-daily",
            label: "daily digest",
            note: "One message a day, at nine.",
            isChecked: model.isDaily,
            onToggle: (isChecked) => Message.ToggledDaily({ isChecked }),
          },
          h
        ),
      ],
    },
    h
  );
