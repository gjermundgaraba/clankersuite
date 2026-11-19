import {
  Deck,
  Group,
  IconButton,
  KeyHint,
  LinkState,
  PageHead,
  Panel,
  Places,
  Rail,
  SidePane,
  StatusBar,
  Wordmark,
} from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Effect, Option, Schema } from "effect";
import { Command, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Task = Schema.Literals([
  "Write the brief",
  "Book the venue",
  "Send invites",
]);

type Task = typeof Task.Type;

const Place = Schema.Literals([
  "Inbox",
  "Focus",
  "Outline",
  "Someday",
  "Goals & values",
  "Work",
  "Review budget",
  "Launch clankermem v1",
  "Ten-user beta: send invites",
  "Home",
]);

type Place = typeof Place.Type;

const DETAILS: Readonly<Record<Task, string>> = {
  "Write the brief": "Two pages: the goal, the budget and who signs off.",
  "Book the venue":
    "Hold the hall for the second Friday; the deposit is due in a week.",
  "Send invites":
    "After the venue is booked. The list is in the shared folder.",
};

export const Model = Schema.Struct({
  platform: KeyHint.KeyPlatform,
  rail: Rail.Model,
  maybeRailWidth: Schema.Option(Schema.Finite),
  place: Place,
  maybeTask: Schema.Option(Task),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  SelectedPlace: { place: Place },
  SelectedTask: { task: Task },
  ClickedClosePane: {},
  GotRailMessage: { message: Rail.Message },
  GotStatusBarMessage: { message: StatusBar.Message },
});

export type Message = typeof Message.Type;

const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: {
    platform: "Other",
    rail: Rail.init({ id: "workspace-rail" }),
    maybeRailWidth: Option.none(),
    place: "Focus",
    maybeTask: Option.some("Write the brief"),
  },
  commands: [DetectKeyPlatform()],
});

const toRailMessage = (message: Rail.Message): Message =>
  Message.GotRailMessage({ message });

const railFold = {
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, rail: Rail.Model): Model =>
    modifyFields(model, { rail: () => rail }),
  toParentMessage: toRailMessage,
};

const foldRail = Update.foldChild({
  update: Rail.update,
  ...railFold,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail:
      ({ width }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeRailWidth: () => Option.some(width),
        }),
      }),
  }),
});

const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    SelectedPlace: ({ place }) =>
      foldRailClose(modifyFields(model, { place: () => place })),
    SelectedTask: ({ task }) => ({
      model: modifyFields(model, { maybeTask: () => Option.some(task) }),
    }),
    ClickedClosePane: () => ({
      model: modifyFields(model, { maybeTask: () => Option.none() }),
    }),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotStatusBarMessage: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Rail.subscriptions("rail"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.rail),
  toParentMessage: toRailMessage,
});

type Spot = Readonly<{
  place: Place;
  glyph?: GlyphName;
  marker?: Places.Marker;
  count?: number;
  subPlaces?: readonly Place[];
}>;

const placesView = (
  model: Model,
  label: string,
  spots: readonly Spot[],
  h: HtmlBuilder<Message>,
  isLabelShown = false
): Html => {
  const placeOf = ({
    place,
    subPlaces = [],
    ...shown
  }: Spot): Places.Place<Message> => ({
    ...shown,
    id: place,
    label: place,
    isCurrent: model.place === place,
    onSelect: Message.SelectedPlace({ place }),
    subPlaces: Array.map(subPlaces, (subPlace) => placeOf({ place: subPlace })),
  });

  return Places.view(
    { label, isLabelShown, places: Array.map(spots, placeOf) },
    h
  );
};

const sidebarView = (model: Model, h: HtmlBuilder<Message>): Rail.Aside => ({
  head: [Wordmark.view({ label: "wtf" }, h)],
  body: [
    placesView(
      model,
      "Lists",
      [
        { place: "Inbox", glyph: "inbox", count: 5 },
        { place: "Focus", glyph: "star", count: 7 },
        { place: "Outline", glyph: "layers" },
        { place: "Someday", glyph: "archive" },
      ],
      h
    ),
    placesView(
      model,
      "Goals",
      [{ place: "Goals & values", glyph: "target" }],
      h
    ),
    placesView(
      model,
      "Areas",
      [
        {
          place: "Work",
          marker: "Amber",
          count: 6,
          subPlaces: [
            "Review budget",
            "Launch clankermem v1",
            "Ten-user beta: send invites",
          ],
        },
        { place: "Home", marker: "Sky", count: 5 },
      ],
      h,
      true
    ),
  ],
  foot: [LinkState.view({ state: "Online", label: "Synced" }, h)],
});

const tasksView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Tasks",
      places: Array.map(Task.literals, (task) => ({
        id: task,
        label: task,
        isCurrent: Option.contains(model.maybeTask, task),
        onSelect: Message.SelectedTask({ task }),
      })),
    },
    h
  );

const paneView = (task: Task, h: HtmlBuilder<Message>): Html =>
  SidePane.view(
    {
      label: "Task details",
      body: [
        Group.view(
          {
            body: [
              h.h2([], [task]),
              IconButton.view(
                {
                  glyph: "cross",
                  label: "Close the details",
                  onClick: Message.ClickedClosePane(),
                },
                h
              ),
            ],
          },
          h
        ),
        h.p([], [DETAILS[task]]),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: Rail.id(model.rail),
        model: model.rail,
        view: Rail.view,
        viewInputs: {
          label: "Places",
          maybeWidth: model.maybeRailWidth,
          toAsideView: () => sidebarView(model, h),
          toDeckView: (openButton) =>
            Deck.view(
              {
                body: [
                  openButton,
                  PageHead.view(
                    {
                      title: model.place,
                      meta: "Wednesday 18 November · 3 to do",
                    },
                    h
                  ),
                  Panel.view(
                    {
                      id: "workspace-tasks",
                      title: "Tasks",
                      isFlush: true,
                      body: [tasksView(model, h)],
                    },
                    h
                  ),
                ],
              },
              h
            ),
          toPaneView: () =>
            Option.match(model.maybeTask, {
              onNone: () => h.empty,
              onSome: (task) => paneView(task, h),
            }),
        },
        toParentMessage: toRailMessage,
      }),
      StatusBar.view(
        {
          keys: [
            { keys: "J", does: "next" },
            { keys: "K", does: "previous" },
            { keys: "X", does: "complete" },
            { keys: "Enter", does: "open" },
            { keys: "Q", does: "capture" },
            { keys: "W", does: "when" },
            { keys: "Mod+K", does: "commands" },
          ],
          platform: model.platform,
          toParentMessage: (message) =>
            Message.GotStatusBarMessage({ message }),
        },
        h
      ),
    ]
  );
