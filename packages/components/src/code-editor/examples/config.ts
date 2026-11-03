import { CodeEditor } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const ROLLOUT = `# rollout
window = "Tue 09:00"
drain = true
batch = 4
notify = "ops"
rollback = "auto"
`;

export const Model = Schema.Struct({ code: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedCode: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { code: ROLLOUT },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedCode: ({ value }) => ({ model: { code: value } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  CodeEditor.view(
    {
      id: "code-editor-rollout",
      label: "rollout.toml",
      value: model.code,
      onInput: (value) => Message.UpdatedCode({ value }),
    },
    h
  );
