import { Chip, IconButton, Rows } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const TaskId = Schema.Literals(["zig", "client", "taxes", "lars"]);

type TaskId = typeof TaskId.Type;

export const Model = Schema.Struct({
  doneIds: Schema.Array(TaskId),
  maybeOpenId: Schema.Option(TaskId),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledDone: { id: TaskId, isDone: Schema.Boolean },
  OpenedTask: { id: TaskId },
  ClickedWhen: { id: TaskId },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { doneIds: ["lars"], maybeOpenId: Option.some("client") },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledDone: ({ id, isDone }) => ({
      model: modifyFields(model, {
        doneIds: (ids) =>
          isDone
            ? Array.union(ids, [id])
            : Array.filter(ids, (kept) => kept !== id),
      }),
    }),
    OpenedTask: ({ id }) => ({
      model: modifyFields(model, { maybeOpenId: () => Option.some(id) }),
    }),
    ClickedWhen: () => ({ model }),
  });

type Task = Readonly<{
  id: TaskId;
  title: string;
  context: Rows.ContextConfig;
  slot: (h: HtmlBuilder<Message>) => readonly Html[];
}>;

const TASKS: readonly Task[] = [
  {
    id: "zig",
    title: "Learn Zig properly",
    context: { area: { label: "Home", colour: "Sky" } },
    slot: () => [],
  },
  {
    id: "client",
    title: "Rewrite the clankermux web client",
    context: {
      area: { label: "Work", colour: "Amber" },
      parent: "Launch clankermux",
    },
    slot: (h) => [Chip.view({ label: "0/3", isFlat: true }, h)],
  },
  {
    id: "taxes",
    title: "Quarterly taxes",
    context: {
      area: { label: "Home", colour: "Sky" },
      goals: [{ label: "Calmer home admin", colour: "Sky" }],
    },
    slot: (h) => [
      Chip.view({ label: "Overdue 15 Nov", tone: "Blocked", glyph: "flag" }, h),
    ],
  },
  {
    id: "lars",
    title: "Answer Lars about the offsite",
    context: { area: { label: "Work", colour: "Amber" } },
    slot: () => [],
  },
];

const toolsView = (task: Task, h: HtmlBuilder<Message>): readonly Html[] => [
  IconButton.view(
    {
      glyph: "calendar",
      label: `When ${task.title}`,
      isQuiet: true,
      onClick: Message.ClickedWhen({ id: task.id }),
    },
    h
  ),
  IconButton.view(
    {
      glyph: "arrow-right",
      label: `Open ${task.title}`,
      isQuiet: true,
      onClick: Message.OpenedTask({ id: task.id }),
    },
    h
  ),
];

const taskRow = (model: Model, task: Task, h: HtmlBuilder<Message>): Html => {
  const isDone = Array.contains(model.doneIds, task.id);

  return Rows.rowView(
    {
      key: task.id,
      glyph: Rows.checkView(
        {
          id: `task-check-${task.id}`,
          label: task.title,
          isDone,
          onToggle: (next) =>
            Message.ToggledDone({ id: task.id, isDone: next }),
        },
        h
      ),
      body: [
        Rows.titleView(
          {
            label: task.title,
            isDone,
            onOpen: Message.OpenedTask({ id: task.id }),
          },
          h
        ),
        Rows.contextView(task.context, h),
      ],
      slot: task.slot(h),
      tools: toolsView(task, h),
      attributes: Option.contains(model.maybeOpenId, task.id)
        ? [h.AriaCurrent("true")]
        : [],
    },
    h
  );
};

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Someday",
      rows: Array.map(TASKS, (task) => taskRow(model, task, h)),
    },
    h
  );
