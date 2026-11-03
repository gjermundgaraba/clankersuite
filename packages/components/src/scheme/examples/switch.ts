import { Scheme } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  schemeSwitch: Scheme.SchemeSwitch.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotSchemeSwitchMessage: { message: Scheme.SchemeSwitch.Message },
});

export type Message = typeof Message.Type;

const toSchemeSwitchMessage = (message: Scheme.SchemeSwitch.Message) =>
  Message.GotSchemeSwitchMessage({ message });

export const init = (): Update.Return<Model, Message> =>
  Update.foldChildInit(Scheme.SchemeSwitch.init(), {
    toParentModel: (schemeSwitch): Model => ({ schemeSwitch }),
    toParentMessage: toSchemeSwitchMessage,
  });

const foldSchemeSwitch = Update.foldChild({
  update: Scheme.SchemeSwitch.update,
  read: (model: Model) => Option.some(model.schemeSwitch),
  write: (model: Model, schemeSwitch: Scheme.SchemeSwitch.Model): Model =>
    modifyFields(model, { schemeSwitch: () => schemeSwitch }),
  toParentMessage: toSchemeSwitchMessage,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSchemeSwitchMessage: ({ message: schemeMessage }) =>
      foldSchemeSwitch(model, schemeMessage),
  });

export const subscriptions = Subscription.lift(
  Scheme.SchemeSwitch.subscriptions
)<Model, Message>({
  read: (model) => Option.some(model.schemeSwitch),
  toParentMessage: toSchemeSwitchMessage,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "scheme-example-switch",
    model: model.schemeSwitch,
    view: Scheme.SchemeSwitch.view,
    toParentMessage: toSchemeSwitchMessage,
  });
