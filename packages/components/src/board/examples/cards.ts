import {
  Announcer,
  Board,
  Focus,
  IconButton,
  InlineInput,
  LiveRegion,
  Tag,
} from "@gjermundgaraba/components";
import { Array, Duration, Effect, Option, Schema } from "effect";
import { Command, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Task = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  area: Schema.String,
});

type Task = typeof Task.Type;

const Renaming = Schema.Struct({
  taskId: Schema.String,
  input: InlineInput.Model,
});

export const Model = Schema.Struct({
  board: Board.Model,
  tasks: Schema.Array(Task),
  maybeRenaming: Schema.Option(Renaming),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotBoardMessage: { message: Board.Message },
  ClickedTask: { title: Schema.String },
  ClickedArea: { area: Schema.String },
  ClickedRename: { taskId: Schema.String },
  GotRenameMessage: { message: InlineInput.Message },
  CompletedSaveRename: { taskId: Schema.String, text: Schema.String },
  CompletedFocus: {},
  CompletedAnnounce: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const TASKS: readonly Task[] = [
  { id: "sink", title: "Fix the kitchen sink", area: "Home" },
  { id: "taxes", title: "File the quarterly taxes", area: "Admin" },
];

export const init = (): Update.Return<Model, Message> => ({
  model: {
    board: Board.init({ id: "inbox-board" }),
    tasks: TASKS,
    maybeRenaming: Option.none(),
  },
});

const RENAME_ID = "inbox-rename";
const SAVE_TIME = Duration.millis(250);

export const SaveRename = Command.define("SaveRename", {
  args: { taskId: Schema.String, text: Schema.String },
  messages: [Message.CompletedSaveRename],
  execute: ({ taskId, text }) =>
    Effect.sleep(SAVE_TIME).pipe(
      Effect.as(Message.CompletedSaveRename({ taskId, text }))
    ),
});

const cardElementId = (taskId: string): string => `inbox-card-${taskId}`;

const renameButtonId = (taskId: string): string => `inbox-rename-${taskId}`;

const moved = (
  tasks: readonly Task[],
  taskId: string,
  toIndex: number
): readonly Task[] =>
  Option.match(
    Array.findFirst(tasks, (task) => task.id === taskId),
    {
      onNone: () => tasks,
      onSome: (task) =>
        Option.getOrElse(
          Array.insertAt(
            Array.filter(tasks, (other) => other.id !== taskId),
            toIndex,
            task
          ),
          () => tasks
        ),
    }
  );

const foldBoard = Update.foldChild({
  update: Board.update,
  read: (model: Model) => Option.some(model.board),
  write: (model: Model, board: Board.Model): Model =>
    modifyFields(model, { board: () => board }),
  toParentMessage: (message: Board.Message) =>
    Message.GotBoardMessage({ message }),
  foldOutMessage: Board.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ cardId, toIndex }) =>
      (model) => ({
        model: modifyFields(model, {
          tasks: (tasks) => moved(tasks, cardId, toIndex),
        }),
        commands: [Announcer.Flash({ selector: `#${cardElementId(cardId)}` })],
      }),
    SelectedCard: () => (model) => ({ model }),
  }),
});

const renamingTaskId = (model: Model): Option.Option<string> =>
  Option.map(model.maybeRenaming, ({ taskId }) => taskId);

const renameFold = {
  read: (model: Model) => Option.map(model.maybeRenaming, ({ input }) => input),
  write: (model: Model, input: InlineInput.Model): Model =>
    modifyFields(model, {
      maybeRenaming: Option.map((renaming) =>
        modifyFields(renaming, { input: () => input })
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
          Option.map(renamingTaskId(model), (taskId) =>
            SaveRename({ taskId, text })
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
                Option.map(renamingTaskId(model), (taskId) =>
                  Focus.Focus({ id: renameButtonId(taskId) })
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
  taskId: string
): Update.Return<Model, Message> =>
  Option.isSome(model.maybeRenaming)
    ? { model }
    : Update.foldChildInit(InlineInput.init({ id: RENAME_ID }), {
        toParentModel: (input) =>
          modifyFields(model, {
            maybeRenaming: () => Option.some({ taskId, input }),
          }),
        toParentMessage: (message) => Message.GotRenameMessage({ message }),
      });

const saveRename = (
  model: Model,
  taskId: string,
  text: string
): Update.Return<Model, Message> =>
  foldRenameSucceeded(
    modifyFields(model, {
      tasks: Array.map((task) =>
        task.id === taskId ? modifyFields(task, { title: () => text }) : task
      ),
    }),
    taskId
  );

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotBoardMessage: ({ message: boardMessage }) =>
      foldBoard(model, boardMessage),
    ClickedTask: ({ title }) => ({
      model,
      commands: [Announcer.Announce({ text: `Opened ${title}.` })],
    }),
    ClickedArea: ({ area }) => ({
      model,
      commands: [Announcer.Announce({ text: `Showing ${area}.` })],
    }),
    ClickedRename: ({ taskId }) => startRename(model, taskId),
    GotRenameMessage: ({ message: renameMessage }) =>
      foldRename(model, renameMessage),
    CompletedSaveRename: ({ taskId, text }) => saveRename(model, taskId, text),
    CompletedFocus: () => ({ model }),
    CompletedAnnounce: () => ({ model }),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Board.subscriptions("inbox"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.board),
  toParentMessage: (message) => Message.GotBoardMessage({ message }),
});

const renameView = (
  model: Model,
  task: Task,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Option.match(
    Option.filter(model.maybeRenaming, ({ taskId }) => taskId === task.id),
    {
      onNone: () => [],
      onSome: ({ input }) => [
        h.submodel({
          slotId: RENAME_ID,
          model: input,
          view: InlineInput.view,
          viewInputs: { value: task.title, label: `Rename ${task.title}` },
          toParentMessage: (message) => Message.GotRenameMessage({ message }),
        }),
        InlineInput.errorView(input, h),
      ],
    }
  );

const cardView = (
  model: Model,
  task: Task,
  render: Board.CardRender,
  h: HtmlBuilder<Message>
): Html =>
  Board.cardView(
    {
      render,
      title: task.title,
      onOpen: Message.ClickedTask({ title: task.title }),
      editor: renameView(model, task, h),
      attributes: [h.Id(cardElementId(task.id))],
      meta: [
        Tag.view(
          {
            label: task.area,
            onClick: Message.ClickedArea({ area: task.area }),
          },
          h
        ),
        h.span([h.Class("gg-gap")]),
        IconButton.view(
          {
            glyph: "pencil",
            label: `Rename ${task.title}`,
            isQuiet: true,
            onClick: Message.ClickedRename({ taskId: task.id }),
            attributes: [h.Id(renameButtonId(task.id))],
          },
          h
        ),
      ],
    },
    h
  );

const taskCardView =
  (model: Model, h: HtmlBuilder<Message>) =>
  ({ id }: Readonly<{ id: string }>, render: Board.CardRender): Html =>
    Option.match(
      Array.findFirst(model.tasks, (task) => task.id === id),
      {
        onNone: () => h.empty,
        onSome: (task) => cardView(model, task, render, h),
      }
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: Board.id(model.board),
        model: model.board,
        view: Board.view,
        viewInputs: {
          columns: [
            {
              id: "inbox",
              title: "Inbox",
              cards: Array.map(model.tasks, ({ id, title }) => ({
                id,
                label: title,
              })),
            },
          ],
          toCardView: taskCardView(model, h),
        },
        toParentMessage: (message) => Message.GotBoardMessage({ message }),
      }),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
