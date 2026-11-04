import { Fieldset, RadioChoices } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  plan: RadioChoices.Model,
  maybePlan: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotPlanMessage: { message: RadioChoices.Message },
});

export type Message = typeof Message.Type;

const PLAN_ID = "radio-choices-plan";

export const init = (): Update.Return<Model, Message> => ({
  model: {
    plan: RadioChoices.init({ id: PLAN_ID }),
    maybePlan: Option.none(),
  },
});

const toPlanMessage = (message: RadioChoices.Message): Message =>
  Message.GotPlanMessage({ message });

const foldPlan = Update.foldChild({
  update: RadioChoices.update,
  read: (model: Model) => Option.some(model.plan),
  write: (model: Model, nextPlan: RadioChoices.Model): Model =>
    modifyFields(model, { plan: () => nextPlan }),
  toParentMessage: toPlanMessage,
  foldOutMessage: RadioChoices.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ value }) =>
      (model) => ({
        model: modifyFields(model, { maybePlan: () => Option.some(value) }),
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPlanMessage: ({ message: planMessage }) => foldPlan(model, planMessage),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Fieldset.view(
    {
      id: "radio-choices-plan-set",
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
          toParentMessage: toPlanMessage,
        }),
      ],
    },
    h
  );
