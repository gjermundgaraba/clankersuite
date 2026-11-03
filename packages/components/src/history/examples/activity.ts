import {
  Button,
  EmptyState,
  Group,
  History,
  Stack,
  Time,
} from "@gjermundgaraba/components";
import { Array, Number, Option, Schema } from "effect";
import { Subscription } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  pageIndex: Schema.Finite,
  maybeNow: Schema.Option(Schema.Finite),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedOlderActivity: {},
  ClickedLatestActivity: {},
  TickedClock: { now: Schema.Finite },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { pageIndex: 0, maybeNow: Option.none() },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedOlderActivity: () => ({
      model: modifyFields(model, { pageIndex: Number.increment }),
    }),
    ClickedLatestActivity: () => ({
      model: modifyFields(model, { pageIndex: () => 0 }),
    }),
    TickedClock: ({ now }) => ({
      model: modifyFields(model, { maybeNow: () => Option.some(now) }),
    }),
  });

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  clock: Time.clockEntry({
    isActive: () => true,
    toMessage: (now) => Message.TickedClock({ now }),
  }),
}));

type Change = Readonly<{ id: string; at: number; who: string; what: string }>;

const LATEST = Date.UTC(2026, 2, 12, 14, 5);
const MINUTE = 60_000;

const PAGES: ReadonlyArray<readonly Change[]> = [
  [
    {
      id: "9",
      at: LATEST,
      who: "sam · client 4f2a",
      what: "Edited task #41: Book the room (title, due)",
    },
    {
      id: "8",
      at: LATEST - 7 * MINUTE,
      who: "sam · client 4f2a",
      what: "Moved task #40: Write the notes",
    },
    {
      id: "7",
      at: LATEST - 31 * MINUTE,
      who: "ops · key 91c0",
      what: "Created area #6: Later",
    },
  ],
  [
    {
      id: "6",
      at: LATEST - 120 * MINUTE,
      who: "sam · client 4f2a",
      what: "Undid change",
    },
    {
      id: "5",
      at: LATEST - 180 * MINUTE,
      who: "ops · key 91c0",
      what: "Deleted task #12: Old draft",
    },
  ],
];

const toEntry =
  (model: Model, h: HtmlBuilder<Message>) =>
  (change: Change): History.Entry => ({
    id: change.id,
    at: [
      Time.view(
        { at: change.at, format: "DateTime", maybeNow: model.maybeNow },
        h
      ),
    ],
    who: [change.who],
    what: [change.what],
  });

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(Array.get(PAGES, model.pageIndex), {
    onNone: () =>
      EmptyState.view(
        {
          title: "No older activity",
          headingLevel: 3,
          body: ["You have reached the end of the activity history."],
        },
        h
      ),
    onSome: (changes) =>
      History.view(
        {
          entries: Array.map(changes, toEntry(model, h)),
          isWrapped: true,
          variant: "Checks",
          label: "Workspace activity, newest first",
        },
        h
      ),
  });

const pagingView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        ...(model.pageIndex > 0
          ? [
              Button.view(
                {
                  label: "latest activity",
                  isSmall: true,
                  onClick: Message.ClickedLatestActivity(),
                },
                h
              ),
            ]
          : []),
        ...(model.pageIndex < PAGES.length
          ? [
              Button.view(
                {
                  label: "older activity",
                  isSmall: true,
                  onClick: Message.ClickedOlderActivity(),
                },
                h
              ),
            ]
          : []),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view({ body: [pageView(model, h), pagingView(model, h)] }, h);
