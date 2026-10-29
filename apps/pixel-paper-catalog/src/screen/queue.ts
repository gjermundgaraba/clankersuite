import {
  Announcer,
  Board,
  Button,
  Chip,
  EmptyState,
  FilterChip,
  FilterStrip,
  Mark,
  PageHead,
  Panel,
  QueryChip,
  Rows,
  Segmented,
  Tag,
} from "@gjermundgaraba/pixel-paper";
import type { KeyHelp, KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema, pipe } from "effect";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { GROUPS, ITEMS, Item, Status } from "../sample.ts";

const Layout = Schema.Literals(["Outline", "Board"]);

type Layout = typeof Layout.Type;

export const Model = Schema.Struct({
  items: Schema.Array(Item),
  layout: Layout,
  isMarkedOnly: Schema.Boolean,
  query: Schema.String,
  foldedGroupIds: Schema.Array(Schema.String),
  board: Board.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedNewItem: {},
  PressedNewItemKey: {},
  ToggledMarkedOnly: {},
  UpdatedQuery: { value: Schema.String },
  ClickedClearFilter: {},
  SelectedLayout: { layout: Layout },
  ToggledGroup: { groupId: Schema.String },
  ClickedItem: { title: Schema.String },
  GotBoardMessage: { message: Board.Message },
  CompletedAnnounce: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  items: ITEMS,
  layout: "Outline",
  isMarkedOnly: false,
  query: "",
  foldedGroupIds: [],
  board: Board.init({ id: "queue-board" }),
});

const NEW_ITEM_KEY = "N";

export const bindings: readonly KeyHelp.Binding[] = [
  { keys: [NEW_ITEM_KEY], group: "Queue", does: "New item" },
];

const cardId = (itemId: string): string => `queue-card-${itemId}`;

const foldBoard = Update.foldChild({
  update: Board.update,
  read: (model: Model) => Option.some(model.board),
  write: (model: Model, nextBoard: Board.Model): Model =>
    modifyFields(model, { board: () => nextBoard }),
  toParentMessage: (message: Board.Message) =>
    Message.GotBoardMessage({ message }),
  foldOutMessage: Board.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ cardId: itemId, toColumnId }) =>
      (model) => {
        const status = Schema.decodeUnknownSync(Status)(toColumnId);

        return {
          model: modifyFields(model, {
            items: Array.map((item) =>
              item.id === itemId
                ? modifyFields(item, { status: () => status })
                : item
            ),
          }),
          commands: [Announcer.Flash({ selector: `#${cardId(itemId)}` })],
        };
      },
    SelectedCard: () => (model) => ({ model }),
  }),
});

const newItem = (model: Model) => ({
  model,
  commands: [
    Announcer.Announce({ text: "New item (sample): nothing was made." }),
  ],
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedNewItem: () => newItem(model),
    PressedNewItemKey: () => newItem(model),
    ToggledMarkedOnly: () => ({
      model: modifyFields(model, {
        isMarkedOnly: (isMarkedOnly) => !isMarkedOnly,
      }),
    }),
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, { query: () => value }),
    }),
    ClickedClearFilter: () => ({
      model: modifyFields(model, {
        isMarkedOnly: () => false,
        query: () => "",
      }),
    }),
    SelectedLayout: ({ layout }) => ({
      model: modifyFields(model, { layout: () => layout }),
    }),
    ToggledGroup: ({ groupId }) => ({
      model: modifyFields(model, {
        foldedGroupIds: (folded) =>
          Array.contains(folded, groupId)
            ? Array.filter(folded, (id) => id !== groupId)
            : Array.append(folded, groupId),
      }),
    }),
    ClickedItem: ({ title }) => ({
      model,
      commands: [Announcer.Announce({ text: `Opened ${title} (sample).` })],
    }),
    GotBoardMessage: ({ message: boardMessage }) =>
      foldBoard(model, boardMessage),
    CompletedAnnounce: () => ({ model }),
    CompletedFlash: () => ({ model }),
  });

const newItemKeys = Dom.streamFromKeyBindings<Message>({
  bindings: [
    { keys: NEW_ITEM_KEY, mapEvent: () => Message.PressedNewItemKey() },
  ],
});

const keySubscriptions = Subscription.make<Model, Message>()(() => ({
  newItemKey: Subscription.persistentEntry(newItemKeys),
}));

const boardSubscriptions = Subscription.lift(Board.subscriptions("queueBoard"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.board),
  toParentMessage: (message) => Message.GotBoardMessage({ message }),
});

export const subscriptions = Subscription.aggregate(
  keySubscriptions,
  boardSubscriptions
);

const groupName = (id: string): string =>
  Option.match(
    Array.findFirst(GROUPS, (group) => group.id === id),
    { onNone: () => id, onSome: ({ name }) => name }
  );

const itemSlotView = <Message>(
  queueItem: Item,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  ...Option.toArray(
    Option.map(queueItem.maybeDue, (due) =>
      h.span([h.Class(queueItem.isLate ? "due late" : "due")], [due])
    )
  ),
  ...(queueItem.isMarked ? [Mark.view({ label: "Marked" }, h)] : []),
  ...(queueItem.isBlocked
    ? [Chip.view({ label: "blocked", tone: "Blocked" }, h)]
    : []),
  ...(queueItem.status === "Active"
    ? [Chip.view({ label: "active", tone: "Go" }, h)]
    : []),
  ...(queueItem.status === "Done"
    ? [Chip.view({ label: "done", tone: "Done" }, h)]
    : []),
];

const cardMetaView = <Message>(
  queueItem: Item,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  ...(queueItem.isMarked ? [Mark.view({ label: "Marked" }, h)] : []),
  Tag.view({ label: groupName(queueItem.group) }, h),
  ...(queueItem.isBlocked
    ? [Chip.view({ label: "blocked", tone: "Blocked" }, h)]
    : []),
  h.span([h.Class("gap")]),
  ...Option.toArray(
    Option.map(queueItem.maybeAge, (age) => h.span([h.Class("age")], [age]))
  ),
];

export type ViewInputs = Readonly<{ platform: KeyHint.KeyPlatform }>;

const shownItems = (model: Model): readonly Item[] => {
  const query = model.query.trim().toLowerCase();

  return Array.filter(
    model.items,
    (item) =>
      (!model.isMarkedOnly || item.isMarked) &&
      (query === "" || item.title.toLowerCase().includes(query))
  );
};

const isFiltered = (model: Model): boolean =>
  model.isMarkedOnly || model.query !== "";

const LAYOUTS: ReadonlyArray<Segmented.Segment<Layout>> = [
  { value: "Outline", label: "Outline", glyph: "outline" },
  { value: "Board", label: "Board", glyph: "columns" },
];

const filterView = (model: Model, h: HtmlBuilder<Message>): Html =>
  FilterStrip.view(
    {
      body: [
        FilterChip.view(
          {
            label: "marked",
            name: "only",
            isPressed: model.isMarkedOnly,
            onToggle: Message.ToggledMarkedOnly(),
          },
          h
        ),
        QueryChip.view(
          {
            id: "queue-query",
            label: "find",
            value: model.query,
            onInput: (value) => Message.UpdatedQuery({ value }),
            placeholder: "title",
          },
          h
        ),
        ...(isFiltered(model)
          ? [
              FilterChip.view(
                {
                  label: "clear",
                  isReset: true,
                  onToggle: Message.ClickedClearFilter(),
                },
                h
              ),
            ]
          : []),
        h.span([h.Class("spacer")]),
        Segmented.view(
          {
            label: "Layout",
            options: LAYOUTS,
            value: model.layout,
            onSelect: (layout) => Message.SelectedLayout({ layout }),
          },
          h
        ),
      ],
    },
    h
  );

const itemRowView = (item: Item, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: item.id,
      glyph: Rows.glyphView(
        { name: item.status === "Done" ? "box-done" : "box" },
        h
      ),
      body: [
        Rows.titleView(
          {
            label: item.title,
            onOpen: Message.ClickedItem({ title: item.title }),
            isDone: item.status === "Done",
          },
          h
        ),
      ],
      slot: itemSlotView(item, h),
      slotAttributes: [h.Id(`queue-${item.id}-state`)],
      attributes: [
        h.Role("group"),
        h.AriaLabel(item.title),
        h.AriaDescribedBy(`queue-${item.id}-state`),
      ],
    },
    h
  );

const groupRowView = (
  model: Model,
  group: (typeof GROUPS)[number],
  items: readonly Item[],
  h: HtmlBuilder<Message>
): Html => {
  const isOpen = !Array.contains(model.foldedGroupIds, group.id);

  return Rows.rowView(
    {
      key: group.id,
      glyph: Rows.toggleView(
        {
          isExpanded: isOpen,
          label: group.name,
          onToggle: Message.ToggledGroup({ groupId: group.id }),
        },
        h
      ),
      body: [h.span([h.Class("group-name")], [group.name])],
      slot: [Tag.view({ label: `${items.length}` }, h)],
      nested: isOpen ? Array.map(items, (item) => itemRowView(item, h)) : [],
    },
    h
  );
};

const outlineView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const shown = shownItems(model);

  const groups = pipe(
    GROUPS,
    Array.map(
      (group) =>
        [group, Array.filter(shown, (item) => item.group === group.id)] as const
    ),
    Array.filter(([, items]) => Array.isReadonlyArrayNonEmpty(items))
  );

  return Panel.view(
    {
      id: "queue-items",
      title: "Items",
      isFlush: true,
      body: [
        Array.match(groups, {
          onEmpty: () =>
            EmptyState.view(
              {
                title: "Nothing matches",
                headingLevel: 3,
                body: ["No item fits these filters."],
                actions: [
                  Button.view(
                    {
                      label: "clear the filter",
                      isSmall: true,
                      onClick: Message.ClickedClearFilter(),
                    },
                    h
                  ),
                ],
              },
              h
            ),
          onNonEmpty: (present) =>
            Rows.view(
              {
                label: "Items by group",
                isOutline: true,
                rows: Array.map(present, ([group, items]) =>
                  groupRowView(model, group, items, h)
                ),
              },
              h
            ),
        }),
      ],
    },
    h
  );
};

const boardCardView =
  (model: Model, h: HtmlBuilder<Message>) =>
  (card: Board.Card, render: Board.CardRender): Html =>
    Option.match(
      Array.findFirst(model.items, (item) => item.id === card.id),
      {
        onNone: () => h.empty,
        onSome: (item) =>
          Board.cardView(
            {
              render,
              title: item.title,
              onOpen: Message.ClickedItem({ title: item.title }),
              attributes: [h.Id(cardId(item.id))],
              meta: cardMetaView(item, h),
            },
            h
          ),
      }
    );

const emptyColumnView =
  (h: HtmlBuilder<Message>) =>
  (column: Board.Column): readonly Html[] => [
    EmptyState.view(
      {
        title: `Nothing ${column.title.toLowerCase()}`,
        headingLevel: 3,
        body: [`Drop a card here to make it ${column.title.toLowerCase()}.`],
      },
      h
    ),
  ];

export const boardColumns = (model: Model): readonly Board.Column[] => {
  const shown = shownItems(model);

  return Array.map(Status.literals, (status) => ({
    id: status,
    title: status,
    cards: Array.map(
      Array.filter(shown, (item) => item.status === status),
      (item) => ({ id: item.id, label: item.title })
    ),
  }));
};

const boardView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Board.id(model.board),
    model: model.board,
    view: Board.view,
    viewInputs: {
      columns: boardColumns(model),
      toCardView: boardCardView(model, h),
      toEmptyView: emptyColumnView(h),
    },
    toParentMessage: (message) => Message.GotBoardMessage({ message }),
  });

export const view = defineView<Model, Message, ViewInputs>(
  (model, { platform }, h): Html =>
    h.div(
      [h.Class("spec-screen")],
      [
        PageHead.view(
          {
            title: "Queue",
            meta: `${shownItems(model).length} of ${model.items.length} items`,
            actions: [
              Button.view(
                {
                  label: "new item",
                  variant: "Primary",
                  glyph: "plus",
                  keyHint: { keys: NEW_ITEM_KEY, platform },
                  onClick: Message.ClickedNewItem(),
                },
                h
              ),
            ],
          },
          h
        ),
        filterView(model, h),
        model.layout === "Outline"
          ? outlineView(model, h)
          : boardView(model, h),
      ]
    )
);
