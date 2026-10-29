import {
  Button,
  Card,
  Field,
  Focus,
  Notice,
  Outcome,
  PasswordField,
  Wall,
} from "@gjermundgaraba/pixel-paper";
import { Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { brandView } from "../spec.ts";

const Missing = Schema.Literals(["Name", "Password"]);

type Missing = typeof Missing.Type;

export const Model = Schema.Struct({
  name: Schema.String,
  password: Schema.String,
  isPasswordShown: Schema.Boolean,
  maybeMissing: Schema.Option(Missing),
  isSignedIn: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  UpdatedPassword: { value: Schema.String },
  ToggledPasswordShown: {},
  SubmittedSignIn: {},
  ClickedSignOut: {},
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  name: "",
  password: "",
  isPasswordShown: false,
  maybeMissing: Option.none(),
  isSignedIn: false,
});

const NAME_ID = "si-name";
const PASSWORD_ID = "si-pass";

const MISSING_WORDS: Readonly<Record<Missing, string>> = {
  Name: "Enter the owner name.",
  Password: "Enter the password.",
};

const SIGN_OUT_ID = "si-sign-out";

const missingOf = (model: Model): Option.Option<Missing> => {
  if (model.name.trim() === "") {
    return Option.some("Name");
  }

  if (model.password === "") {
    return Option.some("Password");
  }

  return Option.none();
};

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedName: ({ value }) => ({
      model: modifyFields(model, { name: () => value }),
    }),
    UpdatedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => value }),
    }),
    ToggledPasswordShown: () => ({
      model: modifyFields(model, { isPasswordShown: (isShown) => !isShown }),
    }),
    SubmittedSignIn: () => {
      const maybeMissing = missingOf(model);

      return Option.match(maybeMissing, {
        onNone: () => ({
          model: modifyFields(model, {
            password: () => "",
            isPasswordShown: () => false,
            maybeMissing: () => maybeMissing,
            isSignedIn: () => true,
          }),
          commands: [Focus.Focus({ id: SIGN_OUT_ID })],
        }),
        onSome: (missing) => ({
          model: modifyFields(model, { maybeMissing: () => maybeMissing }),
          commands: [
            Focus.Focus({ id: missing === "Name" ? NAME_ID : PASSWORD_ID }),
          ],
        }),
      });
    },
    ClickedSignOut: () => ({
      model: init(),
      commands: [Focus.Focus({ id: NAME_ID })],
    }),
    CompletedFocus: () => ({ model }),
  });

const signedInView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.view(
    {
      title: "Sign in",
      meta: "signed in",
      isNarrow: true,
      actions: [
        Button.view(
          {
            label: "sign out",
            onClick: Message.ClickedSignOut(),
            attributes: [h.Id(SIGN_OUT_ID)],
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        Outcome.view(
          {
            tone: "Ok",
            title: "Signed in",
            body: [
              `Signed in as ${model.name.trim()}. Nothing was checked: this is a sample.`,
            ],
          },
          h
        ),
      ],
    },
    h
  );

const missingNoticeView = (
  model: Model,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Option.toArray(
    Option.map(model.maybeMissing, (missing) =>
      Notice.view(
        {
          tone: "Error",
          title: "Not signed in",
          body: [MISSING_WORDS[missing]],
        },
        h
      )
    )
  );

const errorOf = (model: Model, missing: Missing): string | undefined =>
  Option.contains(model.maybeMissing, missing)
    ? MISSING_WORDS[missing]
    : undefined;

const fieldsView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  Field.view(
    {
      id: NAME_ID,
      label: "Owner name",
      value: model.name,
      onInput: (value) => Message.UpdatedName({ value }),
      isBoxed: true,
      error: errorOf(model, "Name"),
      inputAttributes: [h.Autocomplete("username")],
    },
    h
  ),
  PasswordField.view(
    {
      id: PASSWORD_ID,
      label: "Password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isPasswordShown,
      onToggleShown: Message.ToggledPasswordShown(),
      error: errorOf(model, "Password"),
      help: "There is no password recovery. Keep it in a password manager.",
      autocomplete: "current-password",
    },
    h
  ),
];

const formView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.formView(
    {
      id: "sign-in",
      title: "Sign in",
      meta: "owner",
      isNarrow: true,
      onSubmit: Message.SubmittedSignIn(),
      submit: "sign in",
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        ...missingNoticeView(model, h),
        ...fieldsView(model, h),
        Notice.view(
          {
            tone: "Quiet",
            body: [
              "Sample sign-in: any name and password work here, and nothing is sent anywhere.",
            ],
          },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  model.isSignedIn ? signedInView(model, h) : formView(model, h)
);
