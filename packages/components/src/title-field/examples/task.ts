import { TitleField } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  title: Schema.String,
  saved: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  PressedEnter: {},
  GotTitleFieldMessage: { message: TitleField.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    title: "Renew passport before March",
    saved: "Renew passport before March",
  },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedTitle: ({ value }) => ({
      model: modifyFields(model, { title: () => value }),
    }),
    PressedEnter: () => ({
      model: modifyFields(model, { saved: () => model.title }),
    }),
    GotTitleFieldMessage: () => ({ model }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      TitleField.view(
        {
          id: "title-field-task",
          label: "Title",
          value: model.title,
          onInput: (value) => Message.UpdatedTitle({ value }),
          onEnter: Message.PressedEnter(),
          toParentMessage: (message) =>
            Message.GotTitleFieldMessage({ message }),
        },
        h
      ),
      h.p([], [`Saved: ${model.saved}`]),
    ]
  );
