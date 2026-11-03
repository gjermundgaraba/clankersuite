import { Choice, Stack } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isRemembered: Schema.Boolean,
  isArchived: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledRemembered: { isChecked: Schema.Boolean },
  ToggledArchived: { isChecked: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isRemembered: true, isArchived: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledRemembered: ({ isChecked }) => ({
      model: modifyFields(model, { isRemembered: () => isChecked }),
    }),
    ToggledArchived: ({ isChecked }) => ({
      model: modifyFields(model, { isArchived: () => isChecked }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Choice.view(
          {
            id: "choice-note-remembered",
            label: "remember this device",
            isChecked: model.isRemembered,
            onToggle: (isChecked) => Message.ToggledRemembered({ isChecked }),
          },
          h
        ),
        Choice.view(
          {
            id: "choice-note-archived",
            label: "show archived",
            note: "Archived projects list after the rest, greyed.",
            isChecked: model.isArchived,
            onToggle: (isChecked) => Message.ToggledArchived({ isChecked }),
          },
          h
        ),
      ],
    },
    h
  );
