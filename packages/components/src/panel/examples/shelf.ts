import { Panel, Places, SelectField } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const LIBRARIES = [
  { library: "Home", collections: ["Inbox", "Reading", "Recipes", "Travel"] },
  { library: "Work", collections: ["Briefs", "Contracts"] },
];

export const Model = Schema.Struct({
  library: Schema.String,
  collection: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ChangedLibrary: { library: Schema.String },
  SelectedCollection: { collection: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { library: "Home", collection: "Inbox" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedLibrary: ({ library }) => ({
      model: modifyFields(model, { library: () => library }),
    }),
    SelectedCollection: ({ collection }) => ({
      model: modifyFields(model, { collection: () => collection }),
    }),
  });

const collectionsOf = (library: string): readonly string[] =>
  Option.match(
    Array.findFirst(LIBRARIES, (entry) => entry.library === library),
    { onNone: () => [], onSome: ({ collections }) => collections }
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const collections = collectionsOf(model.library);

  return Panel.view(
    {
      id: "panel-collections",
      title: model.library,
      meta: `${collections.length}`,
      shelf: [
        SelectField.view(
          {
            id: "panel-library",
            label: "Library",
            value: model.library,
            onChange: (library) => Message.ChangedLibrary({ library }),
            options: Array.map(LIBRARIES, ({ library }) => ({
              value: library,
              label: library,
            })),
          },
          h
        ),
      ],
      isFlush: true,
      body: [
        Places.view(
          {
            label: "Collections",
            places: Array.map(collections, (collection) => ({
              id: collection,
              label: collection,
              isCurrent: collection === model.collection,
              onSelect: Message.SelectedCollection({ collection }),
            })),
          },
          h
        ),
      ],
    },
    h
  );
};
