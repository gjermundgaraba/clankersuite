import { Chip, IconButton, Rows } from "@gjermundgaraba/components";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

type Task = Readonly<{
  id: string;
  title: string;
  status: string;
  tone: Chip.Tone;
  subtasks?: readonly Task[];
}>;

const TASKS: readonly Task[] = [
  {
    id: "brief",
    title: "Write the brief for the spring release",
    status: "In progress",
    tone: "Go",
    subtasks: [
      { id: "outline", title: "Outline it", status: "Done", tone: "Done" },
      {
        id: "figures",
        title: "Gather the figures",
        status: "To do",
        tone: "Plain",
      },
    ],
  },
  {
    id: "venue",
    title: "Book the venue",
    status: "Cancelled",
    tone: "Blocked",
  },
];

const CURRENT_TASK_ID = "outline";

const taskRow = <Message>(task: Task, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: task.id,
      glyph: Chip.dotView({ label: task.status, tone: task.tone }, h),
      body: [
        h.a(
          [
            h.Href(`#task-${task.id}`),
            ...(task.id === CURRENT_TASK_ID ? [h.AriaCurrent("page")] : []),
          ],
          [task.title]
        ),
      ],
      actions: [
        IconButton.view(
          { glyph: "more", label: `Menu for ${task.title}`, isQuiet: true },
          h
        ),
      ],
      isLink: true,
      nested: Array.map(task.subtasks ?? [], (subtask) => taskRow(subtask, h)),
    },
    h
  );

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Tasks",
      isOutline: true,
      rows: Array.map(TASKS, (task) => taskRow(task, h)),
    },
    h
  );
