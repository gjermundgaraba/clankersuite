import {
  Card,
  Field,
  Focus,
  LinkButton,
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

import { screenUrl } from "../route.ts";
import { sampleStrength } from "../sample.ts";
import { brandView } from "../spec.ts";

const InvalidField = Schema.Literals(["Name", "Password", "PasswordAgain"]);

type InvalidField = typeof InvalidField.Type;

export const Model = Schema.Struct({
  name: Schema.String,
  password: Schema.String,
  passwordAgain: Schema.String,
  isPasswordShown: Schema.Boolean,
  isPasswordAgainShown: Schema.Boolean,
  maybeInvalid: Schema.Option(InvalidField),
  isOwnerMade: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  UpdatedPassword: { value: Schema.String },
  UpdatedPasswordAgain: { value: Schema.String },
  ToggledPasswordShown: {},
  ToggledPasswordAgainShown: {},
  SubmittedSetup: {},
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  name: "",
  password: "",
  passwordAgain: "",
  isPasswordShown: false,
  isPasswordAgainShown: false,
  maybeInvalid: Option.none(),
  isOwnerMade: false,
});

const FIELD_IDS: Readonly<Record<InvalidField, string>> = {
  Name: "su-name",
  Password: "su-pass",
  PasswordAgain: "su-again",
};

const CONSOLE_ID = "su-console";

const MINIMUM_LENGTH = 12;

const invalidFieldOf = (model: Model): Option.Option<InvalidField> => {
  if (model.name.trim() === "") {
    return Option.some("Name");
  }

  if (model.password.length < MINIMUM_LENGTH) {
    return Option.some("Password");
  }

  if (model.password !== model.passwordAgain) {
    return Option.some("PasswordAgain");
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
    UpdatedPasswordAgain: ({ value }) => ({
      model: modifyFields(model, { passwordAgain: () => value }),
    }),
    ToggledPasswordShown: () => ({
      model: modifyFields(model, { isPasswordShown: (isShown) => !isShown }),
    }),
    ToggledPasswordAgainShown: () => ({
      model: modifyFields(model, {
        isPasswordAgainShown: (isShown) => !isShown,
      }),
    }),
    SubmittedSetup: () => {
      const maybeInvalid = invalidFieldOf(model);

      return Option.match(maybeInvalid, {
        onNone: () => ({
          model: modifyFields(model, {
            maybeInvalid: () => maybeInvalid,
            isOwnerMade: () => true,
          }),
          commands: [Focus.Focus({ id: CONSOLE_ID })],
        }),
        onSome: (invalid) => ({
          model: modifyFields(model, { maybeInvalid: () => maybeInvalid }),
          commands: [Focus.Focus({ id: FIELD_IDS[invalid] })],
        }),
      });
    },
    CompletedFocus: () => ({ model }),
  });

const ERROR_WORDS: Readonly<Record<InvalidField, string>> = {
  Name: "Enter the owner's name.",
  Password: `Make the password at least ${MINIMUM_LENGTH} characters.`,
  PasswordAgain: "The two passwords differ. Type it again.",
};

const ownerMadeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.view(
    {
      title: "Setup",
      meta: "done",
      isNarrow: true,
      actions: [
        LinkButton.view(
          {
            label: "open the console",
            href: screenUrl("console"),
            variant: "Primary",
            attributes: [h.Id(CONSOLE_ID)],
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        Outcome.view(
          {
            tone: "Ok",
            title: "Owner made",
            body: [
              `${model.name.trim()} owns this service now. Sign-up is closed: nobody else can make an account here.`,
            ],
          },
          h
        ),
      ],
    },
    h
  );

const invalidNoticeView = (
  model: Model,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Option.toArray(
    Option.map(model.maybeInvalid, (invalid) =>
      Notice.view(
        {
          tone: "Error",
          title: "Not made yet",
          body: [ERROR_WORDS[invalid]],
        },
        h
      )
    )
  );

const errorOf = (model: Model, field: InvalidField): string | undefined =>
  Option.contains(model.maybeInvalid, field) ? ERROR_WORDS[field] : undefined;

const nameFieldView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Field.view(
    {
      id: FIELD_IDS.Name,
      label: "Owner name",
      value: model.name,
      onInput: (value) => Message.UpdatedName({ value }),
      isBoxed: true,
      error: errorOf(model, "Name"),
      inputAttributes: [h.Autocomplete("username")],
    },
    h
  );

const passwordFieldsView = (
  model: Model,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  PasswordField.view(
    {
      id: FIELD_IDS.Password,
      label: "Password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isPasswordShown,
      onToggleShown: Message.ToggledPasswordShown(),
      error: errorOf(model, "Password"),
      help: `At least ${MINIMUM_LENGTH} characters. There is no recovery: keep it in a password manager.`,
      strength: sampleStrength(model.password),
      autocomplete: "new-password",
    },
    h
  ),
  PasswordField.view(
    {
      id: FIELD_IDS.PasswordAgain,
      label: "Password again",
      value: model.passwordAgain,
      onInput: (value) => Message.UpdatedPasswordAgain({ value }),
      isShown: model.isPasswordAgainShown,
      onToggleShown: Message.ToggledPasswordAgainShown(),
      toggleLabel: "Show password again",
      error: errorOf(model, "PasswordAgain"),
      autocomplete: "new-password",
    },
    h
  ),
];

const formView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.formView(
    {
      id: "setup",
      title: "Setup",
      meta: "first run",
      isNarrow: true,
      onSubmit: Message.SubmittedSetup(),
      submit: "make the owner",
      body: [
        Wall.markView({ brand: brandView(h), glyph: "user" }, h),
        h.p(
          [h.Class("note-line")],
          [
            "Nobody owns this service yet. The account made here is its owner, and the only one.",
          ]
        ),
        ...invalidNoticeView(model, h),
        nameFieldView(model, h),
        ...passwordFieldsView(model, h),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  model.isOwnerMade ? ownerMadeView(model, h) : formView(model, h)
);
