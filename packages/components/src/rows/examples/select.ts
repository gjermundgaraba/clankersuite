import { Rows } from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  selectedIds: Schema.Array(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledItem: { id: Schema.String, isChecked: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { selectedIds: ["room"] },
});

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
  });

type Item = Readonly<{ id: string; title: string; isDone: boolean }>;

const ITEMS: readonly Item[] = [
  { id: "notes", title: "Write the notes", isDone: false },
  { id: "room", title: "Book the room", isDone: false },
  { id: "drafts", title: "Archive the drafts", isDone: true },
];

const itemRow = (model: Model, item: Item, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: item.id,
      select: {
        id: `select-item-${item.id}`,
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Rows.view(
    {
      label: "Items",
      rows: Array.map(ITEMS, (item) => itemRow(model, item, h)),
    },
    h
  );
