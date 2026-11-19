import {
  Button,
  Chip,
  Choice,
  GoalCard,
  PageHead,
  Rows,
  Stack,
} from "@gjermundgaraba/components";
import type { Marker } from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

type Task = Readonly<{ title: string; isInFocus?: boolean }>;

type Goal = Readonly<{
  id: string;
  title: string;
  colour: Marker.Colour;
  description: string;
  area: Readonly<{ label: string; colour: Marker.Colour }>;
  outcomes: readonly string[];
  tasks: readonly Task[];
}>;

const GOALS: readonly Goal[] = [
  {
    id: "beta",
    title: "Ship the beta",
    colour: "Amber",
    description: "Get real users on it.",
    area: { label: "Work", colour: "Amber" },
    outcomes: ["Ten users", "Docs published"],
    tasks: [
      { title: "Review budget", isInFocus: true },
      { title: "Collect receipts", isInFocus: true },
      { title: "Ten-user beta: send invites" },
      { title: "Write onboarding email" },
    ],
  },
  {
    id: "clankermem",
    title: "Launch clankermem v1",
    colour: "Coral",
    description: "Public v1 with a migration path from 0.x.",
    area: { label: "Work", colour: "Amber" },
    outcomes: [
      "Benchmark on 1M messages",
      "Migration guide",
      "Announcement post",
    ],
    tasks: [
      { title: "Write migration guide", isInFocus: true },
      { title: "Benchmark summary tree on 1M messages" },
    ],
  },
];

export const Model = Schema.Struct({
  doneOutcomes: Schema.Array(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledOutcome: { outcome: Schema.String, isDone: Schema.Boolean },
  ClickedNewGoal: {},
  ToggledTask: {},
  OpenedTask: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { doneOutcomes: ["Docs published"] },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledOutcome: ({ outcome, isDone }) => ({
      model: modifyFields(model, {
        doneOutcomes: (outcomes) =>
          isDone
            ? Array.union(outcomes, [outcome])
            : Array.filter(outcomes, (kept) => kept !== outcome),
      }),
    }),
    ClickedNewGoal: () => ({ model }),
    ToggledTask: () => ({ model }),
    OpenedTask: () => ({ model }),
  });

const slug = (words: string): string =>
  words.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");

const taskRow = (goal: Goal, task: Task, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: task.title,
      glyph: Rows.checkView(
        {
          id: `goal-${goal.id}-${slug(task.title)}`,
          label: task.title,
          isDone: false,
          onToggle: () => Message.ToggledTask(),
        },
        h
      ),
      body: [
        Rows.titleView({ label: task.title, onOpen: Message.OpenedTask() }, h),
      ],
      slot:
        task.isInFocus === true
          ? [Chip.view({ label: "Focus", glyph: "star", isFlat: true }, h)]
          : [],
    },
    h
  );

const goalView = (model: Model, goal: Goal, h: HtmlBuilder<Message>): Html => {
  const steps = Array.map(goal.outcomes, (outcome) => ({
    label: outcome,
    isDone: Array.contains(model.doneOutcomes, outcome),
  }));

  const done = Array.filter(steps, (step) => step.isDone).length;

  return GoalCard.view(
    {
      id: `goal-${goal.id}`,
      title: goal.title,
      colour: goal.colour,
      description: goal.description,
      chip: Chip.view(
        { label: goal.area.label, marker: { colour: goal.area.colour } },
        h
      ),
      steps,
      meta: `${done} of ${goal.outcomes.length} outcomes · ${goal.tasks.length} open tasks`,
      columns: [
        {
          label: "Outcomes",
          body: Array.map(goal.outcomes, (outcome) =>
            Choice.view(
              {
                id: `goal-${goal.id}-${slug(outcome)}`,
                label: outcome,
                isChecked: Array.contains(model.doneOutcomes, outcome),
                onToggle: (isDone) =>
                  Message.ToggledOutcome({ outcome, isDone }),
              },
              h
            )
          ),
        },
        {
          label: "Moving it",
          body: [
            Rows.view(
              {
                label: `Tasks moving ${goal.title}`,
                isCompact: true,
                rows: Array.map(goal.tasks, (task) => taskRow(goal, task, h)),
              },
              h
            ),
          ],
        },
      ],
    },
    h
  );
};

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      gap: "L",
      body: [
        PageHead.view(
          {
            title: "Goals & values",
            glyph: "target",
            meta: "Why the tasks exist. Each goal shows its outcomes and the tasks moving it.",
            actions: [
              Button.view(
                {
                  label: "New goal",
                  glyph: "plus",
                  onClick: Message.ClickedNewGoal(),
                },
                h
              ),
            ],
          },
          h
        ),
        GoalCard.valuesView(
          {
            label: "Values",
            body: [
              "Ship small things often. Protect mornings for deep work. Be the person who calls back.",
            ],
          },
          h
        ),
        ...Array.map(GOALS, (goal) => goalView(model, goal, h)),
      ],
    },
    h
  );
