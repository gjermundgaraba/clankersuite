import { Card, Field, Focus, Notice } from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema, String } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  email: Schema.String,
  isSending: Schema.Boolean,
  maybeSentTo: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedEmail: { value: Schema.String },
  SubmittedInvite: {},
  CompletedSendInvite: {},
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

const FORM_ID = "invite-form";
const SEND_TIME = Duration.millis(1400);

export const init = (): Update.Return<Model, Message> => ({
  model: { email: "", isSending: false, maybeSentTo: Option.none() },
});

export const SendInvite = Command.define("SendInvite", {
  messages: [Message.CompletedSendInvite],
  execute: Effect.sleep(SEND_TIME).pipe(
    Effect.as(Message.CompletedSendInvite())
  ),
});

const canSend = (model: Model): boolean =>
  String.isNonEmpty(String.trim(model.email)) && !model.isSending;

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedEmail: ({ value }) => ({
      model: modifyFields(model, { email: () => value }),
    }),
    SubmittedInvite: () =>
      canSend(model)
        ? {
            model: modifyFields(model, {
              isSending: () => true,
              maybeSentTo: () => Option.none(),
            }),
            commands: [
              Focus.Focus({ id: Card.submitId(FORM_ID) }),
              SendInvite(),
            ],
          }
        : { model },
    CompletedSendInvite: () => ({
      model: {
        email: "",
        isSending: false,
        maybeSentTo: Option.some(String.trim(model.email)),
      },
    }),
    CompletedFocus: () => ({ model }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.formView(
    {
      id: FORM_ID,
      title: "Invite",
      isNarrow: true,
      isBusy: model.isSending,
      isSubmitDisabled: String.isEmpty(String.trim(model.email)),
      onSubmit: Message.SubmittedInvite(),
      submit: "send invite",
      notices: Option.match(model.maybeSentTo, {
        onNone: () => [],
        onSome: (email) => [
          Notice.view({ tone: "Ok", body: [`Invited ${email}.`] }, h),
        ],
      }),
      body: [
        Field.view(
          {
            id: "invite-email",
            label: "Email",
            type: "email",
            value: model.email,
            onInput: (value) => Message.UpdatedEmail({ value }),
            help: "They get a link to join this space.",
          },
          h
        ),
      ],
    },
    h
  );
