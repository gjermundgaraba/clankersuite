import {
  Bench,
  Button,
  ConfirmDialog,
  LinkState,
  Notice,
  PageHead,
  Panel,
  Rail,
  Reel,
  Rows,
  StatusBar,
} from "@gjermundgaraba/pixel-paper";
import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { SAMPLE_TASKS, taskRow } from "../example/lists.ts";
import { SAMPLE_LAYOUT, closed, paneView } from "../example/reel.ts";
import { SITE_KEY_NOTES } from "../site-keys.ts";

export const Model = Schema.Struct({
  rail: Rail.Model,
  maybeRailWidth: Schema.Option(Schema.Finite),
  isRailHidden: Schema.Boolean,
  reel: Reel.Model,
  layout: Reel.Layout,
  stopConfirm: ConfirmDialog.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotStatusBarMessage: { message: StatusBar.Message },
  GotRailMessage: { message: Rail.Message },
  GotReelMessage: { message: Reel.Message },
  ClickedClose: { paneId: Schema.String },
  ClickedStop: {},
  GotStopConfirmMessage: { message: ConfirmDialog.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  rail: Rail.init({ id: "workspace-rail" }),
  maybeRailWidth: Option.none(),
  isRailHidden: false,
  reel: Reel.init({ id: "workspace-reel" }),
  layout: SAMPLE_LAYOUT,
  stopConfirm: ConfirmDialog.init({ id: "workspace-stop" }),
});

const foldRail = Update.foldChild({
  update: Rail.update,
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, nextRail: Rail.Model): Model =>
    modifyFields(model, { rail: () => nextRail }),
  toParentMessage: (message: Rail.Message) =>
    Message.GotRailMessage({ message }),
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

const stopConfirmFold = {
  read: (model: Model) => Option.some(model.stopConfirm),
  write: (model: Model, nextStopConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { stopConfirm: () => nextStopConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotStopConfirmMessage({ message }),
};

const foldStopConfirmOpen = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...stopConfirmFold,
});

const foldStopConfirmClose = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...stopConfirmFold,
});

const foldStopConfirm = Update.foldChild({
  update: ConfirmDialog.update,
  ...stopConfirmFold,
  foldOutMessage: ConfirmDialog.OutMessage.match<Update.Step<Model, Message>>({
    Confirmed: () => foldStopConfirmClose,
    Cancelled: () => (model) => ({ model }),
  }),
});

const toReelMessage = (message: Reel.Message): Message =>
  Message.GotReelMessage({ message });

const withLayout = (
  model: Model,
  layout: Reel.Layout
): Update.Return<Model, Message> => {
  const reconciled = Reel.reconcile(model.reel, { layout });

  return {
    model: modifyFields(model, {
      layout: () => layout,
      reel: () => reconciled.model,
    }),
    commands: Command.mapMessages(reconciled.commands, toReelMessage),
  };
};

const foldReel = (
  model: Model,
  message: Reel.Message
): Update.Return<Model, Message> =>
  Update.foldChildStep({
    update: (reel: Reel.Model) =>
      Reel.update(reel, message, { layout: model.layout }),
    read: (current: Model) => Option.some(current.reel),
    write: (current: Model, nextReel: Reel.Model): Model =>
      modifyFields(current, { reel: () => nextReel }),
    toParentMessage: toReelMessage,
    foldOutMessage: (request: Reel.OutMessage) => (current: Model) =>
      withLayout(current, Reel.apply(current.layout, request)),
  })(model);

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotStatusBarMessage: () => ({ model }),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotReelMessage: ({ message: reelMessage }) => foldReel(model, reelMessage),
    ClickedClose: ({ paneId }) =>
      withLayout(model, closed(model.layout, paneId)),
    ClickedStop: () => foldStopConfirmOpen(model),
    GotStopConfirmMessage: ({ message: confirmMessage }) =>
      foldStopConfirm(model, confirmMessage),
  });

export const isDialogOpen = (model: Model): boolean =>
  ConfirmDialog.isOpen(model.stopConfirm);

export const subscriptions = Subscription.aggregate(
  Subscription.lift(Rail.subscriptions("workspaceRail"))<Model, Message>({
    read: (model) => Option.some(model.rail),
    toParentMessage: (message) => Message.GotRailMessage({ message }),
  }),
  Subscription.lift(Reel.subscriptions("workspaceReel"))<Model, Message>({
    read: (model) => Option.some(model.reel),
    toParentMessage: toReelMessage,
  })
);

export type ViewInputs = Readonly<{
  platform: KeyHint.KeyPlatform;
  toScreenNavView: () => Html;
  toLiveRegionView?: (() => Html) | undefined;
}>;

export const DESCRIPTION =
  "A rail of tasks beside a bench: the task's head, then its windows, the window wide.";

const CURRENT_TASK = "brief";

const asideView = (toggle: Html, h: HtmlBuilder<Message>): readonly Html[] => [
  Panel.view(
    {
      id: "workspace-tasks",
      title: "Tasks",
      meta: `${SAMPLE_TASKS.length}`,
      lead: [toggle],
      isFlush: true,
      body: [
        Rows.view(
          {
            label: "Tasks (sample)",
            isOutline: true,
            rows: Array.map(SAMPLE_TASKS, (task) =>
              taskRow(task, { currentId: CURRENT_TASK, href: "#main" }, h)
            ),
          },
          h
        ),
      ],
    },
    h
  ),
];

const benchView = (
  model: Model,
  viewInputs: ViewInputs,
  openButton: Html,
  h: HtmlBuilder<Message>
): Html =>
  Bench.view(
    {
      head: [
        openButton,
        PageHead.view(
          {
            title: "Write the brief (sample)",
            meta: "in progress",
            actions: [
              Button.view(
                {
                  label: "stop",
                  isSmall: true,
                  onClick: Message.ClickedStop(),
                },
                h
              ),
              viewInputs.toScreenNavView(),
            ],
          },
          h
        ),
        Notice.view(
          {
            title: "Behind main",
            body: [
              "Two commits landed on main since this task branched (sample).",
            ],
          },
          h
        ),
        Notice.view(
          {
            tone: "Quiet",
            body: ["Two windows are read-only while the review runs (sample)."],
          },
          h
        ),
      ],
      body: [
        h.submodel({
          slotId: model.reel.id,
          model: model.reel,
          view: Reel.view,
          viewInputs: {
            layout: model.layout,
            label: "Windows (sample)",
            toPaneView: paneView(h, (paneId) =>
              Message.ClickedClose({ paneId })
            ),
          },
          toParentMessage: toReelMessage,
        }),
        h.submodel({
          slotId: ConfirmDialog.id(model.stopConfirm),
          model: model.stopConfirm,
          view: ConfirmDialog.view,
          viewInputs: {
            title: "Stop",
            question: "Stop the task?",
            body: [
              "Its terminals close. The task and its notes stay (sample).",
            ],
            label: "stop",
            isDanger: true,
            toLiveRegionView: viewInputs.toLiveRegionView,
          },
          toParentMessage: (message) =>
            Message.GotStopConfirmMessage({ message }),
        }),
      ],
    },
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.div(
      [h.Class("spec-bare")],
      [
        h.submodel({
          slotId: Rail.id(model.rail),
          model: model.rail,
          view: Rail.view,
          viewInputs: {
            label: "Tasks",
            maybeWidth: model.maybeRailWidth,
            isHidden: model.isRailHidden,
            maybeToggleKeyHint: Option.none(),
            toAsideView: (toggle) => asideView(toggle, h),
            toDeckView: (openButton) =>
              benchView(model, viewInputs, openButton, h),
          },
          toParentMessage: (message) => Message.GotRailMessage({ message }),
        }),
        StatusBar.view(
          {
            body: [LinkState.view({ state: "Online", label: "connected" }, h)],
            keys: SITE_KEY_NOTES,
            platform: viewInputs.platform,
            toParentMessage: (message) =>
              Message.GotStatusBarMessage({ message }),
          },
          h
        ),
      ]
    )
);
