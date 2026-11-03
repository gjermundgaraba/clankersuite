import { MarkdownEditor } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ brief: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedBrief: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    brief:
      "Run the **spring half marathon** under two hours.\n\n- Long run every _Sunday_",
  },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedBrief: ({ value }) => ({ model: { brief: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  MarkdownEditor.view(
    {
      id: "markdown-editor-brief",
      label: "Brief",
      value: model.brief,
      onInput: (value) => Message.UpdatedBrief({ value }),
      help: "Marks show only around the caret.",
      rows: 3,
    },
    h
  );
