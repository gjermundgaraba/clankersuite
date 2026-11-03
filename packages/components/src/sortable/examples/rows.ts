import {
  Announcer,
  Identity,
  LiveRegion,
  Panel,
  Sortable,
} from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Plan = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  meta: Schema.String,
});

type Plan = typeof Plan.Type;

export const Model = Schema.Struct({
  order: Sortable.Model,
  plans: Schema.Array(Plan),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotOrderMessage: { message: Sortable.Message },
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const PLANS: readonly Plan[] = [
  { id: "studio", label: "Studio plan", meta: "5 seats" },
  { id: "team", label: "Team workspace", meta: "12 seats" },
  {
    id: "archive",
    label:
      "The archive of every report the old reporting service ever sent out",
    meta: "read only",
  },
  { id: "trial", label: "Trial", meta: "ends in 9 days" },
];

export const init = (): Update.Return<Model, Message> => ({
  model: { order: Sortable.init({ id: "plan-order" }), plans: PLANS },
});

const planElementId = (planId: string): string => `plan-${planId}`;

const moved = (
  plans: readonly Plan[],
  planId: string,
  toIndex: number
): readonly Plan[] =>
  Option.match(
    Array.findFirst(plans, (plan) => plan.id === planId),
    {
      onNone: () => plans,
      onSome: (plan) =>
        Option.getOrElse(
          Array.insertAt(
            Array.filter(plans, (other) => other.id !== planId),
            toIndex,
            plan
          ),
          () => plans
        ),
    }
  );

const foldOrder = Update.foldChild({
  update: Sortable.update,
  read: (model: Model) => Option.some(model.order),
  write: (model: Model, order: Sortable.Model): Model =>
    modifyFields(model, { order: () => order }),
  toParentMessage: (message: Sortable.Message) =>
    Message.GotOrderMessage({ message }),
  foldOutMessage: Sortable.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ itemId, toIndex }) =>
      (model) => ({
        model: modifyFields(model, {
          plans: (plans) => moved(plans, itemId, toIndex),
        }),
        commands: [Announcer.Flash({ selector: `#${planElementId(itemId)}` })],
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotOrderMessage: ({ message: orderMessage }) =>
      foldOrder(model, orderMessage),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Sortable.subscriptions("order"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.order),
  toParentMessage: (message) => Message.GotOrderMessage({ message }),
});

const metaOf = (plans: readonly Plan[], planId: string): string =>
  Option.match(
    Array.findFirst(plans, (plan) => plan.id === planId),
    { onNone: () => "", onSome: ({ meta }) => meta }
  );

const orderView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "plans",
      title: "Plans",
      meta: `${model.plans.length} plans`,
      isFlush: true,
      body: [
        h.submodel({
          slotId: "plan-order",
          model: model.order,
          view: Sortable.view,
          viewInputs: {
            items: Array.map(model.plans, ({ id, label }) => ({ id, label })),
            label: "Plans in order",
            toItemView: (item, render) => [
              h.div(render.isLifted ? [] : [h.Id(planElementId(item.id))], [
                Identity.view(
                  { label: item.label, meta: [metaOf(model.plans, item.id)] },
                  h
                ),
              ]),
            ],
          },
          toParentMessage: (message) => Message.GotOrderMessage({ message }),
        }),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      orderView(model, h),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
