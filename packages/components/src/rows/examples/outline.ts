import { Chip, Rows } from "@gjermundgaraba/components";
import { Array, Option, Record, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const OutlineId = Schema.Literals([
  "notes",
  "agenda",
  "minutes",
  "later",
]);

export type OutlineId = typeof OutlineId.Type;

export const Model = Schema.Struct({
  isNotesOpen: Schema.Boolean,
  cursorId: OutlineId,
  doneIds: Schema.Array(OutlineId),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledNotes: {},
  FocusedRow: { id: OutlineId },
  ToggledDone: { id: OutlineId, isDone: Schema.Boolean },
  ClickedAdd: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isNotesOpen: true, cursorId: "notes", doneIds: ["agenda"] },
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
  message: Message.FocusedRow({ id }),
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

const fold = (id: OutlineId): Move => ({ id, message: Message.ToggledNotes() });

const openOrEnter = (model: Model, id: OutlineId): Option.Option<Move> =>
  Option.liftPredicate(
    model.isNotesOpen ? moveTo("agenda") : fold(id),
    () => id === "notes"
  );

const closeOrLeave = (model: Model, id: OutlineId): Option.Option<Move> =>
  isUnderNotes(id)
    ? Option.some(moveTo("notes"))
    : Option.liftPredicate(fold(id), () => id === "notes" && model.isNotesOpen);

const KEY_MOVES: Readonly<
  Record<string, (model: Model, id: OutlineId) => Option.Option<Move>>
> = {
  ArrowDown: (model, id) => step(model, id, 1),
  ArrowUp: (model, id) => step(model, id, -1),
  Home: (model) => Option.map(Array.head(visibleIds(model)), moveTo),
  End: (model) => Option.map(Array.last(visibleIds(model)), moveTo),
  ArrowRight: openOrEnter,
  ArrowLeft: closeOrLeave,
};

export const outlineMove = (
  model: Model,
  id: OutlineId,
  key: string
): Option.Option<Move> =>
  Option.flatMap(Record.get(KEY_MOVES, key), (move) => move(model, id));

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledNotes: () => ({
      model: modifyFields(model, {
        isNotesOpen: (isOpen) => !isOpen,
        cursorId: (cursorId) =>
          model.isNotesOpen && isUnderNotes(cursorId) ? "notes" : cursorId,
      }),
    }),
    FocusedRow: ({ id }) => ({
      model: modifyFields(model, { cursorId: () => id }),
    }),
    ToggledDone: ({ id, isDone }) => ({
      model: modifyFields(model, {
        doneIds: (ids) =>
          isDone
            ? Array.union(ids, [id])
            : Array.filter(ids, (kept) => kept !== id),
      }),
    }),
    ClickedAdd: () => ({ model }),
  });

const OUTLINE_ROW = "outline-row";

const TITLES: Readonly<Record<OutlineId, string>> = {
  notes: "Write the notes",
  agenda: "Send the agenda",
  minutes: "File the minutes",
  later: "Book the room",
};

type RowParts = Omit<
  Rows.RowConfig<Message>,
  "key" | "treegrid" | "attributes" | "glyph" | "body"
>;

const outlineRow = (
  model: Model,
  id: OutlineId,
  config: RowParts,
  place: NonNullable<Rows.RowConfig<Message>["treegrid"]>,
  h: HtmlBuilder<Message>
): Html => {
  const isDone = Array.contains(model.doneIds, id);

  return Rows.rowView(
    {
      ...config,
      key: id,
      glyph: Rows.checkView(
        {
          id: `outline-check-${id}`,
          label: TITLES[id],
          isDone,
          onToggle: (next) => Message.ToggledDone({ id, isDone: next }),
        },
        h
      ),
      body: [
        Rows.titleView(
          {
            label: TITLES[id],
            isDone,
            onOpen: Message.FocusedRow({ id }),
          },
          h
        ),
      ],
      treegrid: place,
      attributes: [
        h.DataAttribute(OUTLINE_ROW, id),
        h.Tabindex(model.cursorId === id ? 0 : -1),
        ...(model.cursorId === id ? [h.AriaCurrent("true")] : []),
        h.OnFocus(Message.FocusedRow({ id })),
        h.OnKeyDownFocus((key) =>
          Option.map(outlineMove(model, id, key), (move) => ({
            focusSelector: `[data-${OUTLINE_ROW}="${move.id}"]`,
            message: move.message,
          }))
        ),
      ],
    },
    h
  );
};

const notesRows = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  outlineRow(
    model,
    "agenda",
    {
      slot: [
        Chip.view({ label: "Tomorrow", glyph: "calendar", isFlat: true }, h),
      ],
    },
    { level: 2, position: 1, setSize: 2 },
    h
  ),
  outlineRow(
    model,
    "minutes",
    { isContext: true },
    { level: 2, position: 2, setSize: 2 },
    h
  ),
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.sectionView(
    {
      id: "outline-work",
      title: "Work",
      marker: "Amber",
      count: 2,
      body: [
        Rows.view(
          {
            label: "Work",
            isOutline: true,
            isTreegrid: true,
            rows: [
              outlineRow(
                model,
                "notes",
                {
                  fold: Rows.toggleView(
                    {
                      isExpanded: model.isNotesOpen,
                      label: TITLES.notes,
                      onToggle: Message.ToggledNotes(),
                    },
                    h
                  ),
                  slot: [
                    Chip.view(
                      { label: "Due today", tone: "Warn", glyph: "flag" },
                      h
                    ),
                    Chip.view({ label: "1/2", isFlat: true }, h),
                  ],
                  nested: model.isNotesOpen ? notesRows(model, h) : [],
                },
                {
                  level: 1,
                  position: 1,
                  setSize: 2,
                  isExpanded: model.isNotesOpen,
                },
                h
              ),
              outlineRow(
                model,
                "later",
                {
                  slot: [
                    Chip.view(
                      { label: "Fri 20 Nov", glyph: "flag", isFlat: true },
                      h
                    ),
                  ],
                },
                { level: 1, position: 2, setSize: 2 },
                h
              ),
            ],
          },
          h
        ),
        Rows.addView({ label: "Add to Work", onAdd: Message.ClickedAdd() }, h),
      ],
    },
    h
  );
