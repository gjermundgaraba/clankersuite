import {
  Announcer,
  Board,
  Button,
  EmptyState,
  Focus,
  IconButton,
  InlineInput,
  Tag,
} from "@gjermundgaraba/pixel-paper";
import { Array, Duration, Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { specView } from "../spec.ts";

const Status = Schema.Literals(["Todo", "Doing", "Done"]);

type Status = typeof Status.Type;

const Item = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  area: Schema.String,
  age: Schema.String,
  status: Status,
});

type Item = typeof Item.Type;

const Renaming = Schema.Struct({
  itemId: Schema.String,
  input: InlineInput.Model,
});

export const Model = Schema.Struct({
  board: Board.Model,
  items: Schema.Array(Item),
  maybeCursorId: Schema.Option(Schema.String),
  maybeRenaming: Schema.Option(Renaming),
  isWorking: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotBoardMessage: { message: Board.Message },
  ClickedItem: { title: Schema.String },
  ClickedArea: { area: Schema.String },
  ClickedCapture: { status: Status },
  ToggledWorking: {},
  ClickedRename: { itemId: Schema.String },
  GotRenameMessage: { message: InlineInput.Message },
  CompletedSaveRename: { itemId: Schema.String, text: Schema.String },
  CompletedFocus: {},
  CompletedAnnounce: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const SAMPLE_ITEMS: readonly Item[] = [
  {
    id: "sink",
    title: "Fix the kitchen sink",
    area: "Home",
    age: "3d",
    status: "Todo",
  },
  {
    id: "taxes",
    title: "File the quarterly taxes",
    area: "Admin",
    age: "1w",
    status: "Todo",
  },
  {
    id: "deck",
    title: "Draft the launch deck",
    area: "Work",
    age: "2d",
    status: "Doing",
  },
  {
    id: "tyres",
    title: "Change the winter tyres",
    area: "Car",
    age: "5w",
    status: "Done",
  },
];

export const init = (): Model => ({
  board: Board.init({ id: "sample-board" }),
  items: SAMPLE_ITEMS,
  maybeCursorId: Option.none(),
  maybeRenaming: Option.none(),
  isWorking: false,
});

const RENAME_ID = "sample-card-rename";
const SAVE_TIME = Duration.millis(250);

export const SaveRename = Command.define("SaveRename", {
  args: { itemId: Schema.String, text: Schema.String },
  messages: [Message.CompletedSaveRename],
  execute: ({ itemId, text }) =>
    Effect.sleep(SAVE_TIME).pipe(
      Effect.as(Message.CompletedSaveRename({ itemId, text }))
    ),
});

const cardId = (itemId: string): string => `sample-card-${itemId}`;

const renameButtonId = (itemId: string): string => `sample-rename-${itemId}`;

const statusOf = (columnId: string): Status =>
  Schema.decodeUnknownSync(Status)(columnId);

const insertionIndex = (
  items: readonly Item[],
  maybeAfterId: Option.Option<string>,
  maybeBeforeId: Option.Option<string>
): number =>
  Option.getOrElse(
    Option.orElse(
      Option.flatMap(maybeAfterId, (afterId) =>
        Option.map(
          Array.findFirstIndex(items, (item) => item.id === afterId),
          (index) => index + 1
        )
      ),
      () =>
        Option.flatMap(maybeBeforeId, (beforeId) =>
          Array.findFirstIndex(items, (item) => item.id === beforeId)
        )
    ),
    () => items.length
  );

const placeItem = (
  items: readonly Item[],
  itemId: string,
  status: Status,
  maybeAfterId: Option.Option<string>,
  maybeBeforeId: Option.Option<string>
): readonly Item[] =>
  Option.match(
    Array.findFirst(items, (item) => item.id === itemId),
    {
      onNone: () => items,
      onSome: (item) => {
        const others = Array.filter(items, (other) => other.id !== itemId);

        return Option.getOrElse(
          Array.insertAt(
            others,
            insertionIndex(others, maybeAfterId, maybeBeforeId),
            modifyFields(item, { status: () => status })
          ),
          () => items
        );
      },
    }
  );

const foldBoardOutMessage = Board.OutMessage.match<Update.Step<Model, Message>>(
  {
    Moved:
      ({ cardId: itemId, toColumnId, maybeAfterCardId, maybeBeforeCardId }) =>
      (model) => ({
        model: modifyFields(model, {
          items: (items) =>
            placeItem(
              items,
              itemId,
              statusOf(toColumnId),
              maybeAfterCardId,
              maybeBeforeCardId
            ),
        }),
        commands: [Announcer.Flash({ selector: `#${cardId(itemId)}` })],
      }),
    SelectedCard:
      ({ cardId: itemId }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeCursorId: () => Option.some(itemId),
        }),
      }),
  }
);

const boardFold = {
  read: (model: Model) => Option.some(model.board),
  write: (model: Model, nextBoard: Board.Model): Model =>
    modifyFields(model, { board: () => nextBoard }),
  toParentMessage: (message: Board.Message) =>
    Message.GotBoardMessage({ message }),
  foldOutMessage: foldBoardOutMessage,
};

const foldBoard = Update.foldChild({ update: Board.update, ...boardFold });

const foldBoardStart = Update.foldChildStep({
  update: (board: Board.Model) => Board.setMovable(board, false),
  ...boardFold,
});

const foldBoardStop = Update.foldChildStep({
  update: (board: Board.Model) => Board.setMovable(board, true),
  ...boardFold,
});

const renamingItemId = (model: Model): Option.Option<string> =>
  Option.map(model.maybeRenaming, ({ itemId }) => itemId);

const renameFold = {
  read: (model: Model) => Option.map(model.maybeRenaming, ({ input }) => input),
  write: (model: Model, nextInput: InlineInput.Model): Model =>
    modifyFields(model, {
      maybeRenaming: Option.map((renaming) =>
        modifyFields(renaming, { input: () => nextInput })
      ),
    }),
  toParentMessage: (message: InlineInput.Message) =>
    Message.GotRenameMessage({ message }),
  foldOutMessage: InlineInput.OutMessage.match<Update.Step<Model, Message>>({
    Committed:
      ({ text }) =>
      (model) => ({
        model,
        commands: Array.fromOption(
          Option.map(renamingItemId(model), (itemId) =>
            SaveRename({ itemId, text })
          )
        ),
      }),
    Ended:
      ({ how }) =>
      (model) => ({
        model: modifyFields(model, { maybeRenaming: () => Option.none() }),
        commands:
          how === "Blur"
            ? []
            : Array.fromOption(
                Option.map(renamingItemId(model), (itemId) =>
                  Focus.Focus({ id: renameButtonId(itemId) })
                )
              ),
      }),
  }),
};

const foldRename = Update.foldChild({
  update: InlineInput.update,
  ...renameFold,
});

const foldRenameSucceeded = Update.foldChild({
  update: InlineInput.succeeded,
  ...renameFold,
});

const startRename = (
  model: Model,
  itemId: string
): Update.Return<Model, Message> =>
  Option.isSome(model.maybeRenaming)
    ? { model }
    : Update.foldChildInit(InlineInput.init({ id: RENAME_ID }), {
        toParentModel: (input) =>
          modifyFields(model, {
            maybeRenaming: () => Option.some({ itemId, input }),
          }),
        toParentMessage: (message) => Message.GotRenameMessage({ message }),
      });

const saveRename = (
  model: Model,
  itemId: string,
  text: string
): Update.Return<Model, Message> =>
  foldRenameSucceeded(
    modifyFields(model, {
      items: Array.map((item) =>
        item.id === itemId ? modifyFields(item, { title: () => text }) : item
      ),
    }),
    itemId
  );

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotBoardMessage: ({ message: boardMessage }) =>
      foldBoard(model, boardMessage),
    ClickedItem: ({ title }) => ({
      model,
      commands: [Announcer.Announce({ text: `Opened ${title} (sample).` })],
    }),
    ClickedArea: ({ area }) => ({
      model,
      commands: [Announcer.Announce({ text: `Showing ${area} (sample).` })],
    }),
    ClickedCapture: ({ status }) => ({
      model,
      commands: [
        Announcer.Announce({ text: `Capturing into ${status} (sample).` }),
      ],
    }),
    ToggledWorking: () => {
      const toggled = modifyFields(model, {
        isWorking: (isWorking) => !isWorking,
      });

      return toggled.isWorking
        ? foldBoardStart(toggled)
        : foldBoardStop(toggled);
    },
    ClickedRename: ({ itemId }) => startRename(model, itemId),
    GotRenameMessage: ({ message: renameMessage }) =>
      foldRename(model, renameMessage),
    CompletedSaveRename: ({ itemId, text }) => saveRename(model, itemId, text),
    CompletedFocus: () => ({ model }),
    CompletedAnnounce: () => ({ model }),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(
  Board.subscriptions("exampleBoard")
)<Model, Message>({
  read: (model) => Option.some(model.board),
  toParentMessage: (message) => Message.GotBoardMessage({ message }),
});

const COLUMNS: ReadonlyArray<Readonly<{ status: Status; title: string }>> = [
  { status: "Todo", title: "To do" },
  { status: "Doing", title: "Doing" },
  { status: "Done", title: "Done" },
];

const isCursor = (model: Model, itemId: string): boolean =>
  Option.exists(model.maybeCursorId, (cursorId) => cursorId === itemId);

const renameView = (
  model: Model,
  item: Item,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Option.match(
    Option.filter(model.maybeRenaming, ({ itemId }) => itemId === item.id),
    {
      onNone: () => [],
      onSome: ({ input }) => [
        h.submodel({
          slotId: RENAME_ID,
          model: input,
          view: InlineInput.view,
          viewInputs: { value: item.title, label: `Rename ${item.title}` },
          toParentMessage: (message) => Message.GotRenameMessage({ message }),
        }),
        InlineInput.errorView(input, h),
      ],
    }
  );

const cardView = (
  model: Model,
  item: Item,
  render: Board.CardRender,
  h: HtmlBuilder<Message>
): Html =>
  Board.cardView(
    {
      render,
      title: item.title,
      onOpen: Message.ClickedItem({ title: item.title }),
      isDisabled: model.isWorking,
      editor: renameView(model, item, h),
      attributes: [
        h.Id(cardId(item.id)),
        h.AriaCurrent(isCursor(model, item.id) ? "true" : "false"),
      ],
      meta: [
        Tag.view(
          {
            label: item.area,
            onClick: Message.ClickedArea({ area: item.area }),
          },
          h
        ),
        h.span([h.Class("gap")]),
        h.span([h.Class("age")], [item.age]),
        IconButton.view(
          {
            glyph: "pencil",
            label: `Rename ${item.title}`,
            isQuiet: true,
            onClick: Message.ClickedRename({ itemId: item.id }),
            attributes: [h.Id(renameButtonId(item.id))],
          },
          h
        ),
      ],
    },
    h
  );

const itemCardView =
  (model: Model, h: HtmlBuilder<Message>) =>
  (card: Board.Card, render: Board.CardRender): Html =>
    Option.match(
      Array.findFirst(model.items, (item) => item.id === card.id),
      {
        onNone: () => h.empty,
        onSome: (item) => cardView(model, item, render, h),
      }
    );

const emptyColumnView =
  (h: HtmlBuilder<Message>) =>
  (column: Board.Column): readonly Html[] => [
    EmptyState.view(
      {
        title: `Nothing ${column.title.toLowerCase()}`,
        headingLevel: 3,
        body: ["Drop a card here (sample)."],
      },
      h
    ),
  ];

const columnActionsView =
  (h: HtmlBuilder<Message>) =>
  (column: Board.Column): readonly Html[] => [
    IconButton.view(
      {
        glyph: "plus",
        label: `Capture in ${column.title}`,
        isQuiet: true,
        onClick: Message.ClickedCapture({ status: statusOf(column.id) }),
      },
      h
    ),
  ];

export const boardColumns = (model: Model): readonly Board.Column[] =>
  Array.map(COLUMNS, ({ status, title }) => ({
    id: status,
    title,
    cards: Array.map(
      Array.filter(model.items, (item) => item.status === status),
      (item) => ({ id: item.id, label: item.title })
    ),
  }));

export const view = defineView<Model, Message>((model, h): Html =>
  specView(
    "drag a card, or take its grip with space and the arrow keys; a press on a card selects it; the pencil renames it in place; while work runs nothing moves or opens",
    [
      Button.view(
        {
          label: model.isWorking ? "stop the work" : "start work",
          isSmall: true,
          onClick: Message.ToggledWorking(),
        },
        h
      ),
      h.submodel({
        slotId: Board.id(model.board),
        model: model.board,
        view: Board.view,
        viewInputs: {
          columns: boardColumns(model),
          toCardView: itemCardView(model, h),
          toEmptyView: emptyColumnView(h),
          toColumnActions: columnActionsView(h),
        },
        toParentMessage: (message) => Message.GotBoardMessage({ message }),
      }),
    ],
    h
  )
);
