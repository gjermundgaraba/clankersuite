import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as PasswordField from "./password-field.ts";

const Model = Schema.Struct({
  password: Schema.String,
  isShown: Schema.Boolean,
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  UpdatedPassword: { value: Schema.String },
  ToggledShowPassword: {},
});

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => value }),
    }),
    ToggledShowPassword: () => ({
      model: modifyFields(model, { isShown: (is) => !is }),
    }),
  });

const fieldView = (model: Model, h: HtmlBuilder<Message>) =>
  PasswordField.view(
    {
      id: "new-password",
      label: "New password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isShown,
      onToggleShown: Message.ToggledShowPassword(),
      help: "Twelve characters at least.",
      error: model.password === "" ? "Enter a password." : undefined,
      isRequired: true,
      autocomplete: "new-password",
    },
    h
  );

const input = Scene.label("New password");
const toggle = Scene.role("button", { name: "Show password" });

describe("PasswordField", () => {
  it("hides the password until shown, saying so on its toggle, and that it is required", () => {
    Scene.scene(
      { update, view: fieldView },
      Scene.given<Model>({ password: "", isShown: false }),
      Scene.expect(input).toHaveAttr("type", "password"),
      Scene.expect(input).toHaveAttr("aria-invalid", "true"),
      Scene.expect(input).toHaveAttr("aria-required", "true"),
      Scene.expect(input).toHaveAttr(
        "aria-describedby",
        "new-password-error new-password-description"
      ),
      Scene.expect(Scene.selector(".field-error")).toHaveText(
        "Enter a password."
      ),
      Scene.expect(input).toHaveAttr("autocomplete", "new-password"),
      Scene.expect(toggle).toHaveAttr("aria-pressed", "false"),
      Scene.type(input, "correct horse"),
      Scene.expect(input).not.toHaveAttr("aria-invalid"),
      Scene.expect(input).toHaveAttr(
        "aria-describedby",
        "new-password-description"
      ),
      Scene.click(toggle),
      Scene.expect(input).toHaveAttr("type", "text"),
      Scene.expect(toggle).toHaveAttr("aria-pressed", "true")
    );
  });

  it("names its toggle by toggleLabel, apart from another field's", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          PasswordField.view(
            {
              id: "password-again",
              label: "Password again",
              value: model.password,
              onInput: (value) => Message.UpdatedPassword({ value }),
              isShown: model.isShown,
              onToggleShown: Message.ToggledShowPassword(),
              toggleLabel: "Show password again",
            },
            h
          ),
      },
      Scene.given<Model>({ password: "", isShown: false }),
      Scene.expect(toggle).toBeAbsent(),
      Scene.expect(
        Scene.role("button", { name: "Show password again" })
      ).toExist()
    );
  });
});
