import { Rows } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
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
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledNotes: {},
  MovedCursor: { id: OutlineId },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isNotesOpen: true, cursorId: "notes" },
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

const OUTLINE_ROW = "outline-row";

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
        h.DataAttribute(OUTLINE_ROW, id),
        h.Tabindex(model.cursorId === id ? 0 : -1),
        ...(model.cursorId === id ? [h.AriaCurrent("true")] : []),
        h.OnFocus(Message.MovedCursor({ id })),
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Outline",
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
            body: ["Notes"],
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
