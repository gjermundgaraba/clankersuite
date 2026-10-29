import { Chip, IconButton, Rows } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

// SAMPLE

type Item = Readonly<{ id: string; title: string; isDone: boolean }>;

const SAMPLE_ITEMS: readonly Item[] = [
  { id: "notes", title: "Write the notes (sample)", isDone: false },
  { id: "room", title: "Book the room (sample)", isDone: false },
  { id: "drafts", title: "Archive the drafts (sample)", isDone: true },
];

const OutlineId = Schema.Literals(["notes", "agenda", "minutes", "later"]);

export type OutlineId = typeof OutlineId.Type;

export const Model = Schema.Struct({
  selectedIds: Schema.Array(Schema.String),
  isNotesOpen: Schema.Boolean,
  cursorId: OutlineId,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledItem: { id: Schema.String, isChecked: Schema.Boolean },
  ToggledNotes: {},
  MovedCursor: { id: OutlineId },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  selectedIds: ["room"],
  isNotesOpen: true,
  cursorId: "notes",
});

const NOTES_CHILDREN: readonly OutlineId[] = ["agenda", "minutes"];

const isUnderNotes = (id: OutlineId): boolean =>
  Array.contains(NOTES_CHILDREN, id);

const visibleIds = (model: Model): readonly OutlineId[] =>
  model.isNotesOpen
    ? ["notes", ...NOTES_CHILDREN, "later"]
    : ["notes", "later"];

type Move = Readonly<{ id: OutlineId; message: Message }>;

const moveTo = (id: OutlineId): Move => ({
  id,
  message: Message.MovedCursor({ id }),
});

const step = (
  model: Model,
  id: OutlineId,
  offset: number
): Option.Option<Move> => {
  const ids = visibleIds(model);

  return Option.map(
    Option.flatMap(
      Array.findFirstIndex(ids, (shown) => shown === id),
      (position) => Array.get(ids, position + offset)
    ),
    moveTo
  );
};

export const outlineMove = (
  model: Model,
  id: OutlineId,
  key: string
): Option.Option<Move> => {
  const ids = visibleIds(model);
  const fold: Move = { id, message: Message.ToggledNotes() };

  switch (key) {
    case "ArrowDown": {
      return step(model, id, 1);
    }

    case "ArrowUp": {
      return step(model, id, -1);
    }

    case "Home": {
      return Option.map(Array.head(ids), moveTo);
    }

    case "End": {
      return Option.map(Array.last(ids), moveTo);
    }

    case "ArrowRight": {
      return id === "notes"
        ? Option.some(model.isNotesOpen ? moveTo("agenda") : fold)
        : Option.none();
    }

    case "ArrowLeft": {
      return isUnderNotes(id)
        ? Option.some(moveTo("notes"))
        : Option.liftPredicate(fold, () => id === "notes" && model.isNotesOpen);
    }

    default: {
      return Option.none();
    }
  }
};

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledItem: ({ id, isChecked }) => ({
      model: modifyFields(model, {
        selectedIds: (ids) =>
          isChecked
            ? Array.union(ids, [id])
            : Array.filter(ids, (kept) => kept !== id),
      }),
    }),
    ToggledNotes: () => ({
      model: modifyFields(model, {
        isNotesOpen: (isOpen) => !isOpen,
        cursorId: (cursorId) =>
          model.isNotesOpen && isUnderNotes(cursorId) ? "notes" : cursorId,
      }),
    }),
    MovedCursor: ({ id }) => ({
      model: modifyFields(model, { cursorId: () => id }),
    }),
  });

const itemRow = (model: Model, item: Item, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: item.id,
      select: {
        id: `item-${item.id}`,
        isChecked: Array.contains(model.selectedIds, item.id),
        onToggle: (isChecked) =>
          Message.ToggledItem({ id: item.id, isChecked }),
      },
      glyph: Rows.glyphView({ name: "ring" }, h),
      body: [item.title],
      slot: [item.isDone ? "done" : "open"],
    },
    h
  );

const selectableView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Items (sample)",
      rows: Array.map(SAMPLE_ITEMS, (item) => itemRow(model, item, h)),
    },
    h
  );

const OUTLINE_ROW_KEY = "outline-row";

const outlineRow = (
  model: Model,
  id: OutlineId,
  config: Omit<Rows.RowConfig<Message>, "key" | "treegrid" | "attributes">,
  place: NonNullable<Rows.RowConfig<Message>["treegrid"]>,
  h: HtmlBuilder<Message>
): Html =>
  Rows.rowView(
    {
      ...config,
      key: id,
      treegrid: place,
      attributes: [
        h.DataAttribute(OUTLINE_ROW_KEY, id),
        h.Tabindex(model.cursorId === id ? 0 : -1),
        ...(model.cursorId === id ? [h.AriaCurrent("true")] : []),
        h.OnFocus(Message.MovedCursor({ id })),
        h.OnKeyDownFocus((key) =>
          Option.map(outlineMove(model, id, key), (move) => ({
            focusSelector: `[data-${OUTLINE_ROW_KEY}="${move.id}"]`,
            message: move.message,
          }))
        ),
      ],
    },
    h
  );

const notesRows = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  outlineRow(
    model,
    "agenda",
    { glyph: Rows.glyphView({ name: "ring" }, h), body: ["Agenda"] },
    { level: 2, position: 1, setSize: 2 },
    h
  ),
  outlineRow(
    model,
    "minutes",
    {
      glyph: Rows.glyphView({ name: "ring" }, h),
      body: ["Minutes"],
      isContext: true,
    },
    { level: 2, position: 2, setSize: 2 },
    h
  ),
];

const outlineView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Outline (sample)",
      isOutline: true,
      isTreegrid: true,
      rows: [
        outlineRow(
          model,
          "notes",
          {
            glyph: Rows.toggleView(
              {
                isExpanded: model.isNotesOpen,
                label: "Notes",
                onToggle: Message.ToggledNotes(),
              },
              h
            ),
            body: ["Notes (sample)"],
            nested: model.isNotesOpen ? notesRows(model, h) : [],
          },
          { level: 1, position: 1, setSize: 2, isExpanded: model.isNotesOpen },
          h
        ),
        outlineRow(
          model,
          "later",
          { glyph: Rows.glyphView({ name: "plus" }, h), body: ["Add a row"] },
          { level: 1, position: 2, setSize: 2 },
          h
        ),
      ],
    },
    h
  );

// SAMPLE: tasks in a sidebar, each a link, its status a dot
type Task = Readonly<{
  id: string;
  title: string;
  status: string;
  tone: Chip.Tone;
  subtasks?: readonly Task[];
}>;

export const SAMPLE_TASKS: readonly Task[] = [
  {
    id: "brief",
    title: "Write the brief for the spring release (sample)",
    status: "In progress",
    tone: "Go",
    subtasks: [
      {
        id: "outline",
        title: "Outline it (sample)",
        status: "Done",
        tone: "Done",
      },
      {
        id: "figures",
        title: "Gather the figures (sample)",
        status: "To do",
        tone: "Plain",
      },
    ],
  },
  {
    id: "venue",
    title: "Book the venue (sample)",
    status: "Cancelled",
    tone: "Blocked",
  },
];

export const taskRow = <ParentMessage>(
  task: Task,
  place: Readonly<{ currentId: string; href: string }>,
  h: HtmlBuilder<ParentMessage>
): Html =>
  Rows.rowView(
    {
      key: task.id,
      glyph: Chip.dotView({ label: task.status, tone: task.tone }, h),
      body: [
        h.a(
          [
            h.Href(place.href),
            ...(task.id === place.currentId ? [h.AriaCurrent("page")] : []),
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
      nested: Array.map(task.subtasks ?? [], (subtask) =>
        taskRow(subtask, place, h)
      ),
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  rowView(
    [
      specView(
        "selectable rows: a box on each row",
        [selectableView(model, h)],
        h
      ),
      specView(
        "an outline, a keyboard treegrid: ↑ ↓ move the cursor, → ← unfold and fold",
        [outlineView(model, h)],
        h
      ),
      specView(
        "rows whose box is their link: a status dot before each title, the task you are on inverted, its menu its own",
        [
          Rows.view(
            {
              label: "Tasks (sample)",
              isOutline: true,
              rows: Array.map(SAMPLE_TASKS, (task) =>
                taskRow(task, { currentId: "outline", href: "#lists" }, h)
              ),
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  )
);
