import { Menu, Rows, Stack, Tag } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  rowActions: Schema.Array(Menu.Model),
  pinnedIds: Schema.Array(Schema.String),
  maybeLastAction: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotRowActionsMessage: { rowId: Schema.String, message: Menu.Message },
});

export type Message = typeof Message.Type;

const FILES: ReadonlyArray<Readonly<{ id: string; name: string }>> = [
  { id: "row-notes", name: "field-notes.md" },
  { id: "row-budget", name: "budget.csv" },
];

const nameOf = (rowId: string): string =>
  Option.match(
    Array.findFirst(FILES, (file) => file.id === rowId),
    { onNone: () => rowId, onSome: (file) => file.name }
  );

const rowActionsId = (rowId: string): string => `${rowId}-actions`;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    rowActions: Array.map(FILES, (file) =>
      Menu.init({ id: rowActionsId(file.id) })
    ),
    pinnedIds: [],
    maybeLastAction: Option.none(),
  },
});

const rowItems = (model: Model, rowId: string): readonly Menu.Item[] => [
  Menu.action({ id: "rename", label: "Rename" }),
  Menu.action({ id: "duplicate", label: "Duplicate" }),
  Menu.check({
    id: "pin",
    label: "Pinned",
    isChecked: Array.contains(model.pinnedIds, rowId),
  }),
  Menu.action({ id: "delete", label: "Delete" }),
];

const togglePin =
  (rowId: string): Update.Step<Model, Message> =>
  (model) => ({
    model: modifyFields(model, {
      pinnedIds: (pinnedIds) =>
        Array.contains(pinnedIds, rowId)
          ? Array.filter(pinnedIds, (pinnedId) => pinnedId !== rowId)
          : Array.append(pinnedIds, rowId),
    }),
  });

const recordAction =
  (action: string): Update.Step<Model, Message> =>
  (model) => ({
    model: modifyFields(model, { maybeLastAction: () => Option.some(action) }),
  });

const maybeRowActions = (model: Model, rowId: string) =>
  Array.findFirst(
    model.rowActions,
    (menu) => Menu.id(menu) === rowActionsId(rowId)
  );

const foldRowActions = Update.foldChildAt({
  update: Menu.update,
  readAt: (model: Model, rowId: string) => maybeRowActions(model, rowId),
  writeAt: (model, rowId, menu) =>
    modifyFields(model, {
      rowActions: Array.map((rowMenu) =>
        Menu.id(rowMenu) === rowActionsId(rowId) ? menu : rowMenu
      ),
    }),
  toParentMessage: (rowId, message) =>
    Message.GotRowActionsMessage({ rowId, message }),
  foldOutMessage: (rowId) =>
    Menu.OutMessage.match<Update.Step<Model, Message>>({
      Selected: ({ id }) => recordAction(`${id} ${nameOf(rowId)}`),
      Toggled: () => togglePin(rowId),
    }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRowActionsMessage: ({ rowId, message: menuMessage }) =>
      foldRowActions(model, rowId, menuMessage),
  });

const fileRowView = (
  model: Model,
  file: Readonly<{ id: string; name: string }>,
  h: HtmlBuilder<Message>
): Html =>
  Rows.rowView(
    {
      key: file.id,
      glyph: Rows.glyphView({ name: "page" }, h),
      body: [file.name],
      slot: Array.contains(model.pinnedIds, file.id)
        ? [Tag.view({ label: "pinned" }, h)]
        : [],
      tools: Option.toArray(
        Option.map(maybeRowActions(model, file.id), (menu) =>
          h.submodel({
            slotId: Menu.id(menu),
            model: menu,
            view: Menu.view,
            viewInputs: {
              label: `Actions: ${file.name}`,
              glyph: "more",
              isQuiet: true,
              align: "End",
              items: rowItems(model, file.id),
            },
            toParentMessage: (message) =>
              Message.GotRowActionsMessage({ rowId: file.id, message }),
          })
        )
      ),
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Rows.view(
          { rows: Array.map(FILES, (file) => fileRowView(model, file, h)) },
          h
        ),
        ...Option.toArray(
          Option.map(model.maybeLastAction, (action) => h.p([], [action]))
        ),
      ],
    },
    h
  );
