import { LiveRegion, Reel, Stack, Window } from "@gjermundgaraba/components";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Option, Record, Schema } from "effect";
import { Command, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({
  layout: Reel.Layout,
  strip: Reel.Model,
  tabs: Reel.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotStripMessage: { message: Reel.Message },
  GotTabsMessage: { message: Reel.Message },
});

export type Message = typeof Message.Type;

const LAYOUT: Reel.Layout = [
  {
    id: "work",
    width: 1 / 2,
    panes: [
      { id: "shell", label: "Shell", weight: 1 },
      { id: "notes", label: "Notes", weight: 1 },
    ],
  },
  {
    id: "review",
    width: 1 / 2,
    panes: [{ id: "diff", label: "Diff", weight: 1 }],
  },
  {
    id: "watch",
    width: 1 / 2,
    panes: [{ id: "log", label: "Log", weight: 1 }],
  },
];

export const init = (): Update.Return<Model, Message> => ({
  model: {
    layout: LAYOUT,
    strip: Reel.init({ id: "shared-strip" }),
    tabs: Reel.init({ id: "shared-tabs" }),
  },
});

type Client = "strip" | "tabs";

const ARRANGEMENT: Readonly<Record<Client, Reel.Arrangement>> = {
  strip: "Strip",
  tabs: "Tabs",
};

const TO_MESSAGE: Readonly<Record<Client, (message: Reel.Message) => Message>> =
  {
    strip: (message) => Message.GotStripMessage({ message }),
    tabs: (message) => Message.GotTabsMessage({ message }),
  };

const withLayout = (
  model: Model,
  layout: Reel.Layout
): Update.Return<Model, Message> => {
  const strip = Reel.reconcile(model.strip, { layout });
  const tabs = Reel.reconcile(model.tabs, { layout });

  return {
    model: { layout, strip: strip.model, tabs: tabs.model },
    commands: [
      ...Command.mapMessages(strip.commands, TO_MESSAGE.strip),
      ...Command.mapMessages(tabs.commands, TO_MESSAGE.tabs),
    ],
  };
};

const foldClient = (model: Model, client: Client, message: Reel.Message) =>
  Update.foldChildStep({
    update: (reel: Reel.Model) =>
      Reel.update(reel, message, {
        layout: model.layout,
        arrangement: ARRANGEMENT[client],
      }),
    read: (current: Model) => Option.some(current[client]),
    write: (current: Model, reel: Reel.Model): Model => ({
      ...current,
      [client]: reel,
    }),
    toParentMessage: TO_MESSAGE[client],
    foldOutMessage: (request: Reel.OutMessage) => (current: Model) =>
      withLayout(current, Reel.apply(current.layout, request)),
  })(model);

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotStripMessage: ({ message: reelMessage }) =>
      foldClient(model, "strip", reelMessage),
    GotTabsMessage: ({ message: reelMessage }) =>
      foldClient(model, "tabs", reelMessage),
  });

export const subscriptions = Subscription.aggregate(
  Subscription.lift(Reel.subscriptions("strip"))<Model, Message>({
    read: (model) => Option.some(model.strip),
    toParentMessage: TO_MESSAGE.strip,
  }),
  Subscription.lift(Reel.subscriptions("tabs"))<Model, Message>({
    read: (model) => Option.some(model.tabs),
    toParentMessage: TO_MESSAGE.tabs,
  })
);

const GLYPHS: Readonly<Record<string, GlyphName>> = {
  shell: "terminal",
  notes: "note",
  diff: "diff",
  log: "script",
};

const glyphOf = (pane: Reel.Pane): GlyphName =>
  Option.getOrElse(Record.get(GLYPHS, pane.id), () => "note");

const paneView =
  (h: HtmlBuilder<Message>) =>
  (pane: Reel.Pane, render: Reel.PaneRender): Html =>
    Window.view(
      {
        id: render.id,
        title: pane.label,
        lead: render.lead,
        glyph: glyphOf(pane),
        body: [h.p([], [`${pane.label}, the same pane in both reels.`])],
      },
      h
    );

const clientView = (
  model: Model,
  client: Client,
  label: string,
  h: HtmlBuilder<Message>
): Html =>
  h.submodel({
    slotId: model[client].id,
    model: model[client],
    view: Reel.view,
    viewInputs: {
      layout: model.layout,
      label,
      toPaneView: paneView(h),
      arrangement: ARRANGEMENT[client],
      toTabLeadView: (pane) => [Glyph.view({ name: glyphOf(pane) }, h)],
    },
    toParentMessage: TO_MESSAGE[client],
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        clientView(model, "strip", "Panes, side by side", h),
        clientView(model, "tabs", "Panes, as tabs", h),
        ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
      ],
    },
    h
  );
