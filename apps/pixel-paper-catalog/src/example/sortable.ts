import {
  Announcer,
  Button,
  Identity,
  Panel,
  Sortable,
  Tag,
} from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { wideSpecView } from "../spec.ts";

const Entry = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  meta: Schema.String,
});

type Entry = typeof Entry.Type;

export const Model = Schema.Struct({
  order: Sortable.Model,
  rows: Schema.Array(Entry),
  tiles: Sortable.Model,
  shelf: Schema.Array(Entry),
  panels: Sortable.Model,
  desk: Schema.Array(Entry),
  isDeskReadOnly: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotOrderMessage: { message: Sortable.Message },
  GotTilesMessage: { message: Sortable.Message },
  GotPanelsMessage: { message: Sortable.Message },
  ToggledDeskReadOnly: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const SAMPLE_ROWS: readonly Entry[] = [
  { id: "max", label: "Studio plan", meta: "5 seats" },
  { id: "team", label: "Team workspace", meta: "12 seats" },
  {
    id: "archive",
    label:
      "The archive of every report the old reporting service ever sent out",
    meta: "read only",
  },
  { id: "trial", label: "Trial", meta: "ends in 9 days" },
];

const SAMPLE_SHELF: readonly Entry[] = [
  { id: "notes", label: "Notes", meta: "pinned" },
  { id: "tasks", label: "Tasks", meta: "12 open" },
  { id: "calendar", label: "Calendar", meta: "today" },
  { id: "files", label: "Files", meta: "2 GB" },
  { id: "people", label: "People", meta: "48" },
];

const SAMPLE_DESK: readonly Entry[] = [
  { id: "inbox", label: "Inbox", meta: "3 unread since this morning" },
  { id: "builds", label: "Builds", meta: "all green" },
  {
    id: "alerts",
    label: "Alerts",
    meta: "one paging alert, acknowledged, and two warnings that clear on their own",
  },
  { id: "deploys", label: "Deploys", meta: "next at noon" },
];

export const init = (): Model => ({
  order: Sortable.init({ id: "sample-order" }),
  rows: SAMPLE_ROWS,
  tiles: Sortable.init({ id: "sample-tiles" }),
  shelf: SAMPLE_SHELF,
  panels: Sortable.init({ id: "sample-panels" }),
  desk: SAMPLE_DESK,
  isDeskReadOnly: false,
});

const entryId = (listId: string, id: string): string => `${listId}-${id}`;

const moved = (
  entries: readonly Entry[],
  itemId: string,
  toIndex: number
): readonly Entry[] =>
  Option.match(
    Array.findFirst(entries, (entry) => entry.id === itemId),
    {
      onNone: () => entries,
      onSome: (entry) =>
        Option.getOrElse(
          Array.insertAt(
            Array.filter(entries, (other) => other.id !== itemId),
            toIndex,
            entry
          ),
          () => entries
        ),
    }
  );

type ListKey = "order" | "tiles" | "panels";

type List = Readonly<{
  write: (model: Model, list: Sortable.Model) => Model;
  reorder: (model: Model, itemId: string, toIndex: number) => Model;
  idPrefix: string;
  toMessage: (message: Sortable.Message) => Message;
}>;

const LISTS: Readonly<Record<ListKey, List>> = {
  order: {
    write: (model, order) => modifyFields(model, { order: () => order }),
    reorder: (model, itemId, toIndex) =>
      modifyFields(model, { rows: (rows) => moved(rows, itemId, toIndex) }),
    idPrefix: "order",
    toMessage: (message) => Message.GotOrderMessage({ message }),
  },
  tiles: {
    write: (model, tiles) => modifyFields(model, { tiles: () => tiles }),
    reorder: (model, itemId, toIndex) =>
      modifyFields(model, { shelf: (shelf) => moved(shelf, itemId, toIndex) }),
    idPrefix: "shelf",
    toMessage: (message) => Message.GotTilesMessage({ message }),
  },
  panels: {
    write: (model, panels) => modifyFields(model, { panels: () => panels }),
    reorder: (model, itemId, toIndex) =>
      modifyFields(model, { desk: (desk) => moved(desk, itemId, toIndex) }),
    idPrefix: "desk",
    toMessage: (message) => Message.GotPanelsMessage({ message }),
  },
};

const listFold = (key: ListKey) => {
  const { write, reorder, idPrefix, toMessage } = LISTS[key];

  return {
    read: (model: Model) => Option.some(model[key]),
    write,
    toParentMessage: toMessage,
    foldOutMessage: Sortable.OutMessage.match<Update.Step<Model, Message>>({
      Moved:
        ({ itemId, toIndex }) =>
        (model) => ({
          model: reorder(model, itemId, toIndex),
          commands: [
            Announcer.Flash({ selector: `#${entryId(idPrefix, itemId)}` }),
          ],
        }),
    }),
  };
};

const foldList = (key: ListKey) =>
  Update.foldChild({ update: Sortable.update, ...listFold(key) });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotOrderMessage: ({ message: orderMessage }) =>
      foldList("order")(model, orderMessage),
    GotTilesMessage: ({ message: tilesMessage }) =>
      foldList("tiles")(model, tilesMessage),
    GotPanelsMessage: ({ message: panelsMessage }) =>
      foldList("panels")(model, panelsMessage),
    ToggledDeskReadOnly: () => ({
      model: modifyFields(model, {
        isDeskReadOnly: (isReadOnly) => !isReadOnly,
      }),
    }),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.aggregate(
  Subscription.lift(Sortable.subscriptions("sampleOrder"))<Model, Message>({
    read: (model) => Option.some(model.order),
    toParentMessage: LISTS.order.toMessage,
  }),
  Subscription.lift(Sortable.subscriptions("sampleTiles"))<Model, Message>({
    read: (model) => Option.some(model.tiles),
    toParentMessage: LISTS.tiles.toMessage,
  }),
  Subscription.lift(Sortable.subscriptions("samplePanels"))<Model, Message>({
    read: (model) => Option.some(model.panels),
    toParentMessage: LISTS.panels.toMessage,
  })
);

const itemsOf = (entries: readonly Entry[]): readonly Sortable.Item[] =>
  Array.map(entries, ({ id, label }) => ({ id, label }));

const metaOf = (entries: readonly Entry[], itemId: string): string =>
  Option.match(
    Array.findFirst(entries, (entry) => entry.id === itemId),
    { onNone: () => "", onSome: ({ meta }) => meta }
  );

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-rows")],
    [
      wideSpecView(
        "a list: rows by their grips, a long name",
        [
          Panel.view(
            {
              id: "sample-order-panel",
              title: "Order (sample)",
              meta: `${model.rows.length} plans`,
              isFlush: true,
              body: [
                h.submodel({
                  slotId: "sample-order",
                  model: model.order,
                  view: Sortable.view,
                  viewInputs: {
                    items: itemsOf(model.rows),
                    label: "Plans in order",
                    toItemView: (item, render) => [
                      h.div(
                        render.isLifted
                          ? []
                          : [h.Id(entryId("order", item.id))],
                        [
                          Identity.view(
                            {
                              label: item.label,
                              meta: [metaOf(model.rows, item.id)],
                            },
                            h
                          ),
                        ]
                      ),
                    ],
                  },
                  toParentMessage: (message) =>
                    Message.GotOrderMessage({ message }),
                }),
              ],
            },
            h
          ),
        ],
        h
      ),
      wideSpecView(
        "tiles: a grid that wraps, read across",
        [
          h.submodel({
            slotId: "sample-tiles",
            model: model.tiles,
            view: Sortable.view,
            viewInputs: {
              items: itemsOf(model.shelf),
              label: "Shelf in order",
              layout: "Grid",
              toItemView: (item, render) => [
                h.div(
                  [
                    ...(render.isLifted
                      ? []
                      : [h.Id(entryId("shelf", item.id))]),
                    h.Class("stack gap-s"),
                  ],
                  [
                    h.strong([], [item.label]),
                    Tag.view({ label: metaOf(model.shelf, item.id) }, h),
                  ]
                ),
              ],
            },
            toParentMessage: (message) => Message.GotTilesMessage({ message }),
          }),
        ],
        h
      ),
      wideSpecView(
        "panels: the page's own panels, each by the grip in its title bar, held for a reader",
        [
          Button.view(
            {
              label: "read only",
              isSmall: true,
              onClick: Message.ToggledDeskReadOnly(),
              attributes: [Button.pressedAttribute(model.isDeskReadOnly, h)],
            },
            h
          ),
          h.submodel({
            slotId: "sample-panels",
            model: model.panels,
            view: Sortable.view,
            viewInputs: {
              items: itemsOf(model.desk),
              label: "Desk in order",
              layout: "Panels",
              isReadOnly: model.isDeskReadOnly,
              toItemView: (item, render) => [
                Panel.view(
                  {
                    id: render.isLifted
                      ? entryId("desk-lifted", item.id)
                      : entryId("desk", item.id),
                    title: item.label,
                    lead: [render.grip],
                    body: [h.p([], [metaOf(model.desk, item.id)])],
                    foot: ["sample"],
                  },
                  h
                ),
              ],
            },
            toParentMessage: (message) => Message.GotPanelsMessage({ message }),
          }),
        ],
        h
      ),
    ]
  )
);
