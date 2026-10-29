import { Button, Disclosure, Panel, Tabs } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  tabs: Tabs.Model,
  selectedTab: Schema.String,
  isGrantsOpen: Schema.Boolean,
  isDangerOpen: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
  ToggledGrants: { isOpen: Schema.Boolean },
  ToggledDanger: { isOpen: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  tabs: Tabs.init({ id: "sample-tabs" }),
  selectedTab: "open",
  isGrantsOpen: true,
  isDangerOpen: false,
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
    ToggledGrants: ({ isOpen }) => ({
      model: modifyFields(model, { isGrantsOpen: () => isOpen }),
    }),
    ToggledDanger: ({ isOpen }) => ({
      model: modifyFields(model, { isDangerOpen: () => isOpen }),
    }),
  });

const TABS: ReadonlyArray<Tabs.Tab & Readonly<{ text: string }>> = [
  { value: "open", label: "open", count: 4, text: "Four open items (sample)." },
  {
    value: "waiting",
    label: "waiting",
    count: 2,
    text: "Two items waiting on someone (sample).",
  },
  {
    value: "closed",
    label: "closed",
    text: "Nothing closed this week (sample).",
  },
];

const panelView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Option.match(
    Array.findFirst(TABS, (tab) => tab.value === model.selectedTab),
    { onNone: () => [], onSome: ({ text }) => [h.p([], [text])] }
  );

const tabsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "sample-items",
      title: "Items",
      isFlush: true,
      body: [
        h.submodel({
          slotId: Tabs.id(model.tabs),
          model: model.tabs,
          view: Tabs.view,
          viewInputs: {
            label: "Items by state",
            tabs: TABS,
            selectedValue: model.selectedTab,
            toPanelView: () => [
              h.div([h.Class("panel-body")], panelView(model, h)),
            ],
          },
          toParentMessage: (message) => Message.GotTabsMessage({ message }),
        }),
      ],
    },
    h
  );

const disclosuresView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Disclosure.view(
        {
          id: "sample-grants",
          label: "edit grants",
          meta: "3",
          isOpen: model.isGrantsOpen,
          onToggle: (isOpen) => Message.ToggledGrants({ isOpen }),
          body: [
            h.p([], ["Ada, Grace and Linus can edit this space (sample)."]),
          ],
        },
        h
      ),
      Disclosure.view(
        {
          id: "sample-danger",
          label: "danger zone",
          isOpen: model.isDangerOpen,
          onToggle: (isOpen) => Message.ToggledDanger({ isOpen }),
          body: [
            h.p([], ["Deleting the space removes every item in it (sample)."]),
            Button.view(
              {
                label: "delete space",
                glyph: "trash",
                attributes: [h.Inert(true)],
              },
              h
            ),
          ],
        },
        h
      ),
    ]
  );

export const view = defineView<Model, Message>((model, h): Html =>
  rowView(
    [
      specView(
        "tabs: arrows, Home and End move and select",
        [tabsView(model, h)],
        h
      ),
      specView(
        "disclosures: the caret turns a quarter when open",
        [disclosuresView(model, h)],
        h
      ),
    ],
    h
  )
);
