import { Panel, Tabs } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  tabs: Tabs.Model,
  selectedTab: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { tabs: Tabs.init({ id: "tabs-items" }), selectedTab: "open" },
});

const foldTabs = Update.foldChild({
  update: Tabs.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model: Model, nextTabs: Tabs.Model): Model =>
    modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: (message: Tabs.Message) =>
    Message.GotTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ value }) =>
      (model) => ({ model: modifyFields(model, { selectedTab: () => value }) }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTabsMessage: ({ message: tabsMessage }) => foldTabs(model, tabsMessage),
  });

const TABS = [
  { value: "open", label: "open", text: "Four items are open." },
  { value: "waiting", label: "waiting", text: "Two items wait on someone." },
  { value: "closed", label: "closed", text: "Nothing closed this week." },
];

const panelView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Option.match(
    Array.findFirst(TABS, (tab) => tab.value === model.selectedTab),
    { onNone: () => [], onSome: ({ text }) => [h.p([], [text])] }
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "tabs-panel",
      title: "items",
      body: [
        h.submodel({
          slotId: Tabs.id(model.tabs),
          model: model.tabs,
          view: Tabs.view,
          viewInputs: {
            label: "Items by state",
            tabs: TABS,
            selectedValue: model.selectedTab,
            toPanelView: () => panelView(model, h),
          },
          toParentMessage: (message) => Message.GotTabsMessage({ message }),
        }),
      ],
    },
    h
  );
