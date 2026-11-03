import {
  Button,
  ErrorSummary,
  Field,
  Focus,
  Group,
  PasswordField,
  Stack,
  TextareaField,
} from "@gjermundgaraba/components";
import { Array, Duration, Effect, Option, Schema, String } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const FieldError = Schema.Struct({ id: Schema.String, message: Schema.String });

export const Model = Schema.Struct({
  name: Schema.String,
  hosts: Schema.String,
  password: Schema.String,
  isPasswordShown: Schema.Boolean,
  errors: Schema.Array(FieldError),
  isSaving: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  UpdatedHosts: { value: Schema.String },
  UpdatedPassword: { value: Schema.String },
  ToggledShowPassword: {},
  SubmittedForm: {},
  CompletedFocus: {},
  CompletedSave: {},
});

export type Message = typeof Message.Type;

export const SUMMARY_ID = "error-summary-form-errors";

const NAME_ID = "error-summary-form-name";
const HOSTS_ID = "error-summary-form-hosts";
const PASSWORD_ID = "error-summary-form-password";

export const init = (): Update.Return<Model, Message> => ({
  model: {
    name: "",
    hosts: "",
    password: "",
    isPasswordShown: false,
    errors: [],
    isSaving: false,
  },
});

export const Save = Command.define("Save", {
  messages: [Message.CompletedSave],
  execute: Effect.sleep(Duration.millis(1200)).pipe(
    Effect.as(Message.CompletedSave())
  ),
});

type UpdateReturn = Update.Return<Model, Message>;

const errorsOf = (model: Model): ReadonlyArray<typeof FieldError.Type> =>
  Array.getSomes([
    Option.liftPredicate(
      { id: NAME_ID, message: "Enter the project's name." },
      () => String.isEmpty(String.trim(model.name))
    ),
    Option.liftPredicate({ id: HOSTS_ID, message: "Enter a host." }, () =>
      String.isEmpty(String.trim(model.hosts))
    ),
    Option.liftPredicate(
      { id: PASSWORD_ID, message: "Enter a password." },
      () => String.isEmpty(model.password)
    ),
  ]);

const submit = (model: Model): UpdateReturn =>
  Array.match(errorsOf(model), {
    onEmpty: () => ({
      model: modifyFields(model, { errors: () => [], isSaving: () => true }),
      commands: [Save()],
    }),
    onNonEmpty: (errors) => ({
      model: modifyFields(model, { errors: () => errors }),
      commands: [Focus.Focus({ id: SUMMARY_ID })],
    }),
  });

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedName: ({ value }) => ({
      model: modifyFields(model, { name: () => value }),
    }),
    UpdatedHosts: ({ value }) => ({
      model: modifyFields(model, { hosts: () => value }),
    }),
    UpdatedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => value }),
    }),
    ToggledShowPassword: () => ({
      model: modifyFields(model, { isPasswordShown: (isShown) => !isShown }),
    }),
    SubmittedForm: () => (model.isSaving ? { model } : submit(model)),
    CompletedFocus: () => ({ model }),
    CompletedSave: () => ({
      model: modifyFields(model, {
        isSaving: () => false,
        isPasswordShown: () => false,
      }),
    }),
  });

const errorOf = (model: Model, id: string): string | undefined =>
  Option.getOrUndefined(
    Option.map(
      Array.findFirst(model.errors, (fieldError) => fieldError.id === id),
      ({ message }) => message
    )
  );

const fieldsView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  Field.view(
    {
      id: NAME_ID,
      label: "Project",
      value: model.name,
      onInput: (value) => Message.UpdatedName({ value }),
      error: errorOf(model, NAME_ID),
      isRequired: true,
    },
    h
  ),
  TextareaField.view(
    {
      id: HOSTS_ID,
      label: "Hosts",
      value: model.hosts,
      onInput: (value) => Message.UpdatedHosts({ value }),
      help: "One per line.",
      error: errorOf(model, HOSTS_ID),
      isRequired: true,
      isMono: true,
      rows: 2,
      textareaAttributes: [h.Spellcheck(false), h.Autocapitalize("off")],
    },
    h
  ),
  PasswordField.view(
    {
      id: PASSWORD_ID,
      label: "New password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isPasswordShown,
      onToggleShown: Message.ToggledShowPassword(),
      error: errorOf(model, PASSWORD_ID),
      isRequired: true,
      autocomplete: "new-password",
    },
    h
  ),
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.form(
    [h.Novalidate(true), h.OnSubmit(Message.SubmittedForm())],
    [
      Stack.view(
        {
          body: [
            ErrorSummary.view({ id: SUMMARY_ID, errors: model.errors }, h),
            h.fieldset(
              model.isSaving ? [h.Disabled(true), h.AriaBusy(true)] : [],
              [Stack.view({ body: fieldsView(model, h) }, h)]
            ),
            Group.view(
              {
                body: [
                  Button.view(
                    {
                      label: "save",
                      variant: "Primary",
                      type: "submit",
                      glyph: "save",
                      isBusy: model.isSaving,
                    },
                    h
                  ),
                ],
              },
              h
            ),
          ],
        },
        h
      ),
    ]
  );
