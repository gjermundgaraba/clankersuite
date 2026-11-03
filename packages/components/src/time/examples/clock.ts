import { PropsList, Time } from "@gjermundgaraba/components";
import { Duration, Option, Schema } from "effect";
import { Subscription } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  maybeNow: Schema.Option(Schema.Finite),
  maybeOpenedAt: Schema.Option(Schema.Finite),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  TickedClock: { now: Schema.Finite },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { maybeNow: Option.none(), maybeOpenedAt: Option.none() },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    TickedClock: ({ now }) => ({
      model: modifyFields(model, {
        maybeNow: () => Option.some(now),
        maybeOpenedAt: Option.orElseSome(() => now),
      }),
    }),
  });

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  clock: Time.clockEntry({
    isActive: () => true,
    toMessage: (now) => Message.TickedClock({ now }),
  }),
}));

const FIRST_OPENED_AT = Date.UTC(2026, 2, 12, 14, 5);

const sinceOpened = (model: Model, offset: Duration.Input): number =>
  Option.getOrElse(model.maybeOpenedAt, () => FIRST_OPENED_AT) +
  Duration.toMillis(Duration.fromInputUnsafe(offset));

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { maybeNow } = model;

  return PropsList.view(
    {
      items: [
        {
          label: "Age",
          value: [
            Time.view({ at: sinceOpened(model, "-4 minutes"), maybeNow }, h),
          ],
        },
        {
          label: "Ago",
          value: [
            Time.view(
              { at: sinceOpened(model, "-2 hours"), format: "Ago", maybeNow },
              h
            ),
          ],
        },
        {
          label: "Stale age",
          value: [
            Time.view(
              {
                at: sinceOpened(model, "-19 days"),
                maybeNow,
                staleAfter: Duration.days(1),
              },
              h
            ),
          ],
        },
        {
          label: "Until",
          value: [
            Time.view(
              {
                at: sinceOpened(model, "1 minute"),
                format: "Until",
                maybeNow,
                passed: "reset due",
              },
              h
            ),
          ],
        },
        {
          label: "Date and time",
          value: [
            Time.view(
              {
                at: sinceOpened(model, "-3 days"),
                format: "DateTime",
                maybeNow,
              },
              h
            ),
          ],
        },
      ],
    },
    h
  );
};
