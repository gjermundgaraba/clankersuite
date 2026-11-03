import {
  Announcer,
  Board,
  EmptyState,
  LiveRegion,
  Tag,
} from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Status = Schema.Literals(["Todo", "Doing", "Done"]);

type Status = typeof Status.Type;

const Task = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  area: Schema.String,
  status: Status,
});

type Task = typeof Task.Type;

export const Model = Schema.Struct({
  board: Board.Model,
  tasks: Schema.Array(Task),
  maybeCursorId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotBoardMessage: { message: Board.Message },
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const TASKS: readonly Task[] = [
  { id: "sink", title: "Fix the kitchen sink", area: "Home", status: "Todo" },
  {
    id: "taxes",
    title: "File the quarterly taxes",
    area: "Admin",
    status: "Todo",
  },
  { id: "deck", title: "Draft the launch deck", area: "Work", status: "Doing" },
  {
    id: "tyres",
    title: "Change the winter tyres",
    area: "Car",
    status: "Done",
  },
];

export const init = (): Update.Return<Model, Message> => ({
  model: {
    board: Board.init({ id: "task-board" }),
    tasks: TASKS,
    maybeCursorId: Option.none(),
  },
});

const COLUMNS: ReadonlyArray<Readonly<{ status: Status; title: string }>> = [
  { status: "Todo", title: "To do" },
  { status: "Doing", title: "Doing" },
  { status: "Done", title: "Done" },
];

export const boardColumns = (model: Model): readonly Board.Column[] =>
  Array.map(COLUMNS, ({ status, title }) => ({
    id: status,
    title,
    cards: Array.map(
      Array.filter(model.tasks, (task) => task.status === status),
      (task) => ({ id: task.id, label: task.title })
    ),
  }));

const cardElementId = (taskId: string): string => `task-card-${taskId}`;

const insertionIndex = (
  tasks: readonly Task[],
  maybeAfterId: Option.Option<string>,
  maybeBeforeId: Option.Option<string>
): number =>
  Option.getOrElse(
    Option.orElse(
      Option.flatMap(maybeAfterId, (afterId) =>
        Option.map(
          Array.findFirstIndex(tasks, (task) => task.id === afterId),
          (index) => index + 1
        )
      ),
      () =>
        Option.flatMap(maybeBeforeId, (beforeId) =>
          Array.findFirstIndex(tasks, (task) => task.id === beforeId)
        )
    ),
    () => tasks.length
  );

const placeTask = (
  tasks: readonly Task[],
  taskId: string,
  status: Status,
  maybeAfterId: Option.Option<string>,
  maybeBeforeId: Option.Option<string>
): readonly Task[] =>
  Option.match(
    Array.findFirst(tasks, (task) => task.id === taskId),
    {
      onNone: () => tasks,
      onSome: (task) => {
        const others = Array.filter(tasks, (other) => other.id !== taskId);

        return Option.getOrElse(
          Array.insertAt(
            others,
            insertionIndex(others, maybeAfterId, maybeBeforeId),
            modifyFields(task, { status: () => status })
          ),
          () => tasks
        );
      },
    }
  );

const decodeStatus = Schema.decodeUnknownSync(Status);

const foldBoard = Update.foldChild({
  update: Board.update,
  read: (model: Model) => Option.some(model.board),
  write: (model: Model, board: Board.Model): Model =>
    modifyFields(model, { board: () => board }),
  toParentMessage: (message: Board.Message) =>
    Message.GotBoardMessage({ message }),
  foldOutMessage: Board.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ cardId, toColumnId, maybeAfterCardId, maybeBeforeCardId }) =>
      (model) => ({
        model: modifyFields(model, {
          tasks: (tasks) =>
            placeTask(
              tasks,
              cardId,
              decodeStatus(toColumnId),
              maybeAfterCardId,
              maybeBeforeCardId
            ),
        }),
        commands: [Announcer.Flash({ selector: `#${cardElementId(cardId)}` })],
      }),
    SelectedCard:
      ({ cardId }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeCursorId: () => Option.some(cardId),
        }),
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotBoardMessage: ({ message: boardMessage }) =>
      foldBoard(model, boardMessage),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Board.subscriptions("tasks"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.board),
  toParentMessage: (message) => Message.GotBoardMessage({ message }),
});

const isCursor = (model: Model, taskId: string): boolean =>
  Option.exists(model.maybeCursorId, (cursorId) => cursorId === taskId);

const taskCardView =
  (model: Model, h: HtmlBuilder<Message>) =>
  ({ id }: Readonly<{ id: string }>, render: Board.CardRender): Html =>
    Option.match(
      Array.findFirst(model.tasks, (task) => task.id === id),
      {
        onNone: () => h.empty,
        onSome: (task) =>
          Board.cardView(
            {
              render,
              title: task.title,
              attributes: [
                h.Id(cardElementId(task.id)),
                h.AriaCurrent(isCursor(model, task.id) ? "true" : "false"),
              ],
              meta: [Tag.view({ label: task.area }, h)],
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
        body: ["Drop a card here."],
      },
      h
    ),
  ];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: Board.id(model.board),
        model: model.board,
        view: Board.view,
        viewInputs: {
          columns: boardColumns(model),
          toCardView: taskCardView(model, h),
          toEmptyView: emptyColumnView(h),
        },
        toParentMessage: (message) => Message.GotBoardMessage({ message }),
      }),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
