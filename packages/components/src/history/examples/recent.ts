import {
  Button,
  History,
  Loading,
  Panel,
  Time,
} from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
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

type RecentChange = Readonly<{
  id: string;
  minutesBeforeOpening: number;
  who?: string;
  what: string;
}>;

const RECENT: readonly RecentChange[] = [
  {
    id: "r4",
    minutesBeforeOpening: 4,
    who: "agent",
    what: "Moved the room booking under Later",
  },
  { id: "r3", minutesBeforeOpening: 12, what: "Undid change" },
  {
    id: "r2",
    minutesBeforeOpening: 38,
    who: "agent",
    what: "Renamed area #6 to Someday, maybe",
  },
  { id: "r1", minutesBeforeOpening: 95, what: "Created task #41" },
];

const FIRST_OPENED_AT = Date.UTC(2026, 2, 12, 14, 5);
const MINUTE = 60_000;

const toEntry =
  (model: Model, h: HtmlBuilder<Message>) =>
  (change: RecentChange): History.Entry => ({
    id: change.id,
    at: [
      Time.view(
        {
          at:
            Option.getOrElse(model.maybeOpenedAt, () => FIRST_OPENED_AT) -
            change.minutesBeforeOpening * MINUTE,
          format: "Ago",
          maybeNow: model.maybeNow,
        },
        h
      ),
    ],
    ...(change.who === undefined ? {} : { who: [change.who] }),
    what: [change.what],
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "recent-changes",
      title: "Recent changes",
      body: [
        Loading.view({ isLoading: false, label: "loading changes" }, h),
        History.view(
          {
            entries: Array.map(RECENT, toEntry(model, h)),
            isWrapped: true,
            label: "Recent changes, newest first",
          },
          h
        ),
      ],
      foot: [Button.view({ label: "activity", isSmall: true }, h)],
    },
    h
  );
