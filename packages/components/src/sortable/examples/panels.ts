import {
  Announcer,
  Button,
  Group,
  LiveRegion,
  Panel,
  Sortable,
  Stack,
} from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Feed = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  summary: Schema.String,
});

type Feed = typeof Feed.Type;

export const Model = Schema.Struct({
  desk: Sortable.Model,
  feeds: Schema.Array(Feed),
  isReadOnly: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDeskMessage: { message: Sortable.Message },
  ToggledReadOnly: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const FEEDS: readonly Feed[] = [
  { id: "inbox", label: "Inbox", summary: "3 unread since this morning" },
  { id: "builds", label: "Builds", summary: "all green" },
  {
    id: "alerts",
    label: "Alerts",
    summary:
      "one paging alert, acknowledged, and two warnings that clear on their own",
  },
  { id: "deploys", label: "Deploys", summary: "next at noon" },
];

export const init = (): Update.Return<Model, Message> => ({
  model: {
    desk: Sortable.init({ id: "feed-desk" }),
    feeds: FEEDS,
    isReadOnly: false,
  },
});

const feedPanelId = (feedId: string): string => `feed-${feedId}`;

const moved = (
  feeds: readonly Feed[],
  feedId: string,
  toIndex: number
): readonly Feed[] =>
  Option.match(
    Array.findFirst(feeds, (feed) => feed.id === feedId),
    {
      onNone: () => feeds,
      onSome: (feed) =>
        Option.getOrElse(
          Array.insertAt(
            Array.filter(feeds, (other) => other.id !== feedId),
            toIndex,
            feed
          ),
          () => feeds
        ),
    }
  );

const foldDesk = Update.foldChild({
  update: Sortable.update,
  read: (model: Model) => Option.some(model.desk),
  write: (model: Model, desk: Sortable.Model): Model =>
    modifyFields(model, { desk: () => desk }),
  toParentMessage: (message: Sortable.Message) =>
    Message.GotDeskMessage({ message }),
  foldOutMessage: Sortable.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ itemId, toIndex }) =>
      (model) => ({
        model: modifyFields(model, {
          feeds: (feeds) => moved(feeds, itemId, toIndex),
        }),
        commands: [Announcer.Flash({ selector: `#${feedPanelId(itemId)}` })],
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDeskMessage: ({ message: deskMessage }) => foldDesk(model, deskMessage),
    ToggledReadOnly: () => ({
      model: modifyFields(model, { isReadOnly: (isReadOnly) => !isReadOnly }),
    }),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Sortable.subscriptions("desk"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.desk),
  toParentMessage: (message) => Message.GotDeskMessage({ message }),
});

const summaryOf = (feeds: readonly Feed[], feedId: string): string =>
  Option.match(
    Array.findFirst(feeds, (feed) => feed.id === feedId),
    { onNone: () => "", onSome: ({ summary }) => summary }
  );

const deskView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "feed-desk",
    model: model.desk,
    view: Sortable.view,
    viewInputs: {
      items: Array.map(model.feeds, ({ id, label }) => ({ id, label })),
      label: "Feeds in order",
      layout: "Panels",
      isReadOnly: model.isReadOnly,
      toItemView: (item, render) => [
        Panel.view(
          {
            id: render.isLifted
              ? feedPanelId(`${item.id}-lifted`)
              : feedPanelId(item.id),
            title: item.label,
            lead: [render.grip],
            body: [h.p([], [summaryOf(model.feeds, item.id)])],
          },
          h
        ),
      ],
    },
    toParentMessage: (message) => Message.GotDeskMessage({ message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Group.view(
          {
            body: [
              Button.view(
                {
                  label: "read only",
                  isSmall: true,
                  onClick: Message.ToggledReadOnly(),
                  attributes: [Button.pressedAttribute(model.isReadOnly, h)],
                },
                h
              ),
            ],
          },
          h
        ),
        deskView(model, h),
        ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
      ],
    },
    h
  );
