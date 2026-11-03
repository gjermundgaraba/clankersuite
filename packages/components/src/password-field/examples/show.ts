import { PasswordField } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  password: Schema.String,
  isShown: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedPassword: { value: Schema.String },
  ToggledShowPassword: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { password: "", isShown: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => value }),
    }),
    ToggledShowPassword: () => ({
      model: modifyFields(model, { isShown: (isShown) => !isShown }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  PasswordField.view(
    {
      id: "password-field-show",
      label: "New password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isShown,
      onToggleShown: Message.ToggledShowPassword(),
      help: "Twelve characters at least.",
      isRequired: true,
      autocomplete: "new-password",
    },
    h
  );
