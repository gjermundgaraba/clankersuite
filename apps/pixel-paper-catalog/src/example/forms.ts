import {
  Button,
  Choice,
  ErrorSummary,
  Field,
  FieldGrid,
  Fieldset,
  Focus,
  IconButton,
  MarkdownEditor,
  PasswordField,
  RadioChoices,
  Secret,
  SelectField,
  TextareaField,
} from "@gjermundgaraba/pixel-paper";
import { Array, Duration, Effect, Option, Schema, String } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

const FieldError = Schema.Struct({ id: Schema.String, message: Schema.String });

export const Model = Schema.Struct({
  name: Schema.String,
  owner: Schema.String,
  kind: Schema.String,
  notes: Schema.String,
  brief: Schema.String,
  hosts: Schema.String,
  isMailed: Schema.Boolean,
  isDaily: Schema.Boolean,
  plan: RadioChoices.Model,
  maybePlan: Schema.Option(Schema.String),
  password: Schema.String,
  isPasswordShown: Schema.Boolean,
  errors: Schema.Array(FieldError),
  isSaving: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  UpdatedOwner: { value: Schema.String },
  ChangedKind: { value: Schema.String },
  UpdatedNotes: { value: Schema.String },
  UpdatedBrief: { value: Schema.String },
  UpdatedHosts: { value: Schema.String },
  ToggledMailed: { isChecked: Schema.Boolean },
  ToggledDaily: { isChecked: Schema.Boolean },
  GotPlanMessage: { message: RadioChoices.Message },
  UpdatedPassword: { value: Schema.String },
  ToggledShowPassword: {},
  SubmittedForm: {},
  CompletedFocus: {},
  CompletedWaitForSave: {},
});

export type Message = typeof Message.Type;

const PLAN_ID = "sample-plan";

export const init = (): Model => ({
  name: "",
  owner: "",
  kind: "internal",
  notes: "",
  brief: "",
  hosts: "",
  isMailed: true,
  isDaily: false,
  plan: RadioChoices.init({ id: PLAN_ID }),
  maybePlan: Option.none(),
  password: "",
  isPasswordShown: false,
  errors: [],
  isSaving: false,
});

const ERROR_SUMMARY_ID = "sample-form-errors";
const SAMPLE_SAVE_DURATION = Duration.millis(1200);

export const WaitForSave = Command.define("WaitForSave", {
  messages: [Message.CompletedWaitForSave],
  execute: Effect.sleep(SAMPLE_SAVE_DURATION).pipe(
    Effect.as(Message.CompletedWaitForSave())
  ),
});

type UpdateReturn = Update.Return<Model, Message>;

const foldPlan = (
  model: Model,
  message: RadioChoices.Message
): UpdateReturn => {
  const next = RadioChoices.update(model.plan, message);

  return {
    model: modifyFields(model, {
      plan: () => next.model,
      maybePlan: (held) =>
        next.outMessage === undefined
          ? held
          : Option.some(next.outMessage.value),
    }),
    commands: Command.mapMessages(next.commands ?? [], (planMessage) =>
      Message.GotPlanMessage({ message: planMessage })
    ),
  };
};

const errorsOf = (model: Model): ReadonlyArray<typeof FieldError.Type> =>
  Array.getSomes([
    Option.liftPredicate(
      { id: "sample-name", message: "Enter the project's name." },
      () => String.isEmpty(String.trim(model.name))
    ),
    Option.liftPredicate({ id: "sample-hosts", message: "Enter a host." }, () =>
      String.isEmpty(String.trim(model.hosts))
    ),
    Option.liftPredicate(
      { id: "sample-password", message: "Enter a password." },
      () => String.isEmpty(model.password)
    ),
  ]);

const submit = (model: Model): UpdateReturn =>
  Array.match(errorsOf(model), {
    onEmpty: () => ({
      model: modifyFields(model, { errors: () => [], isSaving: () => true }),
      commands: [WaitForSave()],
    }),
    onNonEmpty: (errors) => ({
      model: modifyFields(model, { errors: () => errors }),
      commands: [Focus.Focus({ id: ERROR_SUMMARY_ID })],
    }),
  });

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedName: ({ value }) => ({
      model: modifyFields(model, { name: () => value }),
    }),
    UpdatedOwner: ({ value }) => ({
      model: modifyFields(model, { owner: () => value }),
    }),
    ChangedKind: ({ value }) => ({
      model: modifyFields(model, { kind: () => value }),
    }),
    UpdatedNotes: ({ value }) => ({
      model: modifyFields(model, { notes: () => value }),
    }),
    UpdatedBrief: ({ value }) => ({
      model: modifyFields(model, { brief: () => value }),
    }),
    UpdatedHosts: ({ value }) => ({
      model: modifyFields(model, { hosts: () => value }),
    }),
    ToggledMailed: ({ isChecked }) => ({
      model: modifyFields(model, { isMailed: () => isChecked }),
    }),
    ToggledDaily: ({ isChecked }) => ({
      model: modifyFields(model, { isDaily: () => isChecked }),
    }),
    GotPlanMessage: ({ message: planMessage }) => foldPlan(model, planMessage),
    UpdatedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => value }),
    }),
    ToggledShowPassword: () => ({
      model: modifyFields(model, { isPasswordShown: (isShown) => !isShown }),
    }),
    SubmittedForm: () => (model.isSaving ? { model } : submit(model)),
    CompletedFocus: () => ({ model }),
    CompletedWaitForSave: () => ({
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

const projectView = (model: Model, h: HtmlBuilder<Message>): Html =>
  FieldGrid.view(
    {
      body: [
        Field.view(
          {
            id: "sample-name",
            label: "Project",
            value: model.name,
            onInput: (value) => Message.UpdatedName({ value }),
            error: errorOf(model, "sample-name"),
            isRequired: true,
          },
          h
        ),
        Field.view(
          {
            id: "sample-owner",
            label: "Owner",
            value: model.owner,
            onInput: (value) => Message.UpdatedOwner({ value }),
            help: "Leave it empty to own it yourself.",
          },
          h
        ),
      ],
    },
    h
  );

const KIND_OPTIONS: SelectField.ViewConfig<Message>["options"] = [
  { value: "internal", label: "Internal" },
  {
    key: "client",
    label: "Client work",
    options: [
      { value: "retainer", label: "Retainer" },
      { value: "fixed", label: "Fixed price" },
      { value: "pilot", label: "Pilot (full this quarter)", isDisabled: true },
    ],
  },
];

const detailsView = (
  model: Model,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  SelectField.view(
    {
      id: "sample-kind",
      label: "Kind",
      value: model.kind,
      onChange: (value) => Message.ChangedKind({ value }),
      options: KIND_OPTIONS,
    },
    h
  ),
  TextareaField.view(
    {
      id: "sample-notes",
      label: "Notes",
      value: model.notes,
      onInput: (value) => Message.UpdatedNotes({ value }),
      help: "What the team should know first.",
      rows: 3,
    },
    h
  ),
  MarkdownEditor.view(
    {
      id: "sample-brief",
      label: "Markdown editor",
      value: model.brief,
      onInput: (value) => Message.UpdatedBrief({ value }),
      help: "Marks show only around the caret.",
      rows: 3,
    },
    h
  ),
  TextareaField.view(
    {
      id: "sample-hosts",
      label: "Hosts",
      value: model.hosts,
      onInput: (value) => Message.UpdatedHosts({ value }),
      help: "One per line.",
      error: errorOf(model, "sample-hosts"),
      isRequired: true,
      isMono: true,
      rows: 2,
      textareaAttributes: [
        h.Placeholder("app.example.com"),
        h.Spellcheck(false),
        h.Autocapitalize("off"),
      ],
    },
    h
  ),
];

const notifyView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Fieldset.view(
    {
      id: "sample-notify",
      label: "Notify",
      body: [
        Choice.view(
          {
            id: "sample-mailed",
            label: "by mail",
            isChecked: model.isMailed,
            onToggle: (isChecked) => Message.ToggledMailed({ isChecked }),
          },
          h
        ),
        Choice.view(
          {
            id: "sample-daily",
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

const planView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Fieldset.view(
    {
      id: "sample-plan-set",
      label: "Plan",
      body: [
        h.submodel({
          slotId: PLAN_ID,
          model: model.plan,
          view: RadioChoices.view,
          viewInputs: {
            label: "Plan",
            options: [
              {
                value: "Monthly",
                label: "monthly",
                note: "Billed each month.",
              },
              { value: "Yearly", label: "yearly", note: "Two months free." },
            ],
            selectedValue: model.maybePlan,
          },
          toParentMessage: (message) => Message.GotPlanMessage({ message }),
        }),
      ],
    },
    h
  );

const passwordView = (model: Model, h: HtmlBuilder<Message>): Html =>
  PasswordField.view(
    {
      id: "sample-password",
      label: "New password",
      value: model.password,
      onInput: (value) => Message.UpdatedPassword({ value }),
      isShown: model.isPasswordShown,
      onToggleShown: Message.ToggledShowPassword(),
      error: errorOf(model, "sample-password"),
      isRequired: true,
      autocomplete: "new-password",
    },
    h
  );

const formView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.form(
    [
      h.Class("stack gap-m"),
      h.Novalidate(true),
      h.OnSubmit(Message.SubmittedForm()),
    ],
    [
      ErrorSummary.view({ id: ERROR_SUMMARY_ID, errors: model.errors }, h),
      h.fieldset(
        [
          ...(model.isSaving ? [h.Disabled(true), h.AriaBusy(true)] : []),
          h.Class("stack gap-m"),
        ],
        [
          projectView(model, h),
          ...detailsView(model, h),
          notifyView(model, h),
          planView(model, h),
          passwordView(model, h),
        ]
      ),
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
    ]
  );

const secretView = (h: HtmlBuilder<Message>): Html =>
  Secret.view(
    {
      value: "pk_sample_4f9a2c7e",
      label: "API key (sample)",
      actions: [
        IconButton.view(
          { glyph: "copy", label: "Copy API key", attributes: [h.Inert(true)] },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-rows")],
    [
      rowView(
        [
          specView(
            "a form: save it empty, then put it right",
            [formView(model, h)],
            h
          ),
        ],
        h
      ),
      rowView(
        [
          specView(
            "secret: a value shown once, with its copy button",
            [secretView(h)],
            h
          ),
        ],
        h
      ),
    ]
  )
);
