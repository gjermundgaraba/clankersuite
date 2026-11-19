import {
  Deck,
  IconButton,
  KeyHint,
  LinkState,
  PageHead,
  Panel,
  Places,
  Rail,
  SidePane,
  StatusBar,
  TopBar,
  Wordmark,
} from "@gjermundgaraba/components";
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

const List = Schema.Literals(["Inbox", "Focus"]);

type List = typeof List.Type;

const COUNTS: Readonly<Record<List, number>> = { Inbox: 3, Focus: 5 };

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
  isRailHidden: Schema.Boolean,
  list: List,
  maybeTask: Schema.Option(Task),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  SelectedList: { list: List },
  SelectedTask: { task: Task },
  ClickedClosePane: {},
  GotRailMessage: { message: Rail.Message },
  GotTopBarMessage: { message: TopBar.Message },
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
    isRailHidden: false,
    list: "Inbox",
    maybeTask: Option.some("Write the brief"),
  },
  commands: [DetectKeyPlatform()],
});

const toRailMessage = (message: Rail.Message): Message =>
  Message.GotRailMessage({ message });

const foldRail = Update.foldChild({
  update: Rail.update,
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, rail: Rail.Model): Model =>
    modifyFields(model, { rail: () => rail }),
  toParentMessage: toRailMessage,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail:
      ({ width }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeRailWidth: () => Option.some(width),
        }),
      }),
    ToggledRail: () => (model) => ({
      model: modifyFields(model, { isRailHidden: (isHidden) => !isHidden }),
    }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    SelectedList: ({ list }) => ({
      model: modifyFields(model, { list: () => list }),
    }),
    SelectedTask: ({ task }) => ({
      model: modifyFields(model, { maybeTask: () => Option.some(task) }),
    }),
    ClickedClosePane: () => ({
      model: modifyFields(model, { maybeTask: () => Option.none() }),
    }),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotTopBarMessage: () => ({ model }),
    GotStatusBarMessage: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Rail.subscriptions("rail"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.rail),
  toParentMessage: toRailMessage,
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      TopBar.view(
        {
          brand: [Wordmark.view({ label: "ledger" }, h)],
          tools: [LinkState.view({ state: "Online" }, h)],
          toParentMessage: (message) => Message.GotTopBarMessage({ message }),
        },
        h
      ),
      h.submodel({
        slotId: Rail.id(model.rail),
        model: model.rail,
        view: Rail.view,
        viewInputs: {
          label: "Lists",
          maybeWidth: model.maybeRailWidth,
          isHidden: model.isRailHidden,
          maybeToggleKeyHint: Option.none(),
          toAsideView: (toggle) => [
            Panel.view(
              {
                id: "workspace-lists",
                title: "Lists",
                lead: [toggle],
                isFlush: true,
                body: [
                  Places.view(
                    {
                      label: "Lists",
                      places: Array.map(List.literals, (list) => ({
                        id: list,
                        label: list,
                        count: COUNTS[list],
                        isCurrent: model.list === list,
                        onSelect: Message.SelectedList({ list }),
                      })),
                    },
                    h
                  ),
                ],
              },
              h
            ),
          ],
          toDeckView: (openButton) =>
            Deck.view(
              {
                body: [
                  openButton,
                  PageHead.view({ title: model.list }, h),
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
              onSome: (task) =>
                SidePane.view(
                  {
                    label: "Task details",
                    body: [
                      Panel.view(
                        {
                          id: "workspace-task",
                          title: task,
                          actions: [
                            IconButton.view(
                              {
                                glyph: "cross",
                                label: "Close the details",
                                onClick: Message.ClickedClosePane(),
                              },
                              h
                            ),
                          ],
                          body: [h.p([], [DETAILS[task]])],
                        },
                        h
                      ),
                    ],
                  },
                  h
                ),
            }),
        },
        toParentMessage: toRailMessage,
      }),
      StatusBar.view(
        {
          body: ["Synced"],
          keys: [{ keys: "Mod+K", does: "commands" }],
          platform: model.platform,
          toParentMessage: (message) =>
            Message.GotStatusBarMessage({ message }),
        },
        h
      ),
    ]
  );
