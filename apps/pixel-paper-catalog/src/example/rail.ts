import { Panel, Places, Rail, SelectField } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { specView } from "../spec.ts";

export const Model = Schema.Struct({
  rail: Rail.Model,
  maybeRailWidth: Schema.Option(Schema.Finite),
  isRailHidden: Schema.Boolean,
  library: Schema.String,
  collection: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotRailMessage: { message: Rail.Message },
  ChangedLibrary: { library: Schema.String },
  SelectedCollection: { collection: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  rail: Rail.init({ id: "sample-rail" }),
  maybeRailWidth: Option.none(),
  isRailHidden: false,
  library: "Home",
  collection: "Inbox",
});

const railFold = {
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, nextRail: Rail.Model): Model =>
    modifyFields(model, { rail: () => nextRail }),
  toParentMessage: (message: Rail.Message) =>
    Message.GotRailMessage({ message }),
};

const foldRail = Update.foldChild({
  update: Rail.update,
  ...railFold,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail:
      ({ width }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeRailWidth: () => Option.some(width),
        }),
      }),
    ToggledRail: () => (model) => ({
      model: modifyFields(model, { isRailHidden: (isHidden) => !isHidden }),
    }),
  }),
});

const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    ChangedLibrary: ({ library }) => ({
      model: modifyFields(model, { library: () => library }),
    }),
    SelectedCollection: ({ collection }) =>
      foldRailClose(modifyFields(model, { collection: () => collection })),
  });

export const subscriptions = Subscription.lift(
  Rail.subscriptions("sampleRail")
)<Model, Message>({
  read: (model) => Option.some(model.rail),
  toParentMessage: (message) => Message.GotRailMessage({ message }),
});

type Collection = Readonly<{ collection: string; count: number }>;

// SAMPLE: each library's collections, the first long enough to scroll under the rail's head
const LIBRARIES: ReadonlyArray<
  Readonly<{ library: string; collections: readonly Collection[] }>
> = [
  {
    library: "Home",
    collections: [
      { collection: "Inbox", count: 12 },
      { collection: "Reading", count: 4 },
      { collection: "Recipes", count: 31 },
      { collection: "Travel", count: 9 },
      { collection: "Garden", count: 6 },
      { collection: "Letters", count: 18 },
      { collection: "Music", count: 44 },
      { collection: "Receipts", count: 57 },
      { collection: "Maps", count: 3 },
      { collection: "Archive", count: 230 },
    ],
  },
  {
    library: "Work",
    collections: [
      { collection: "Briefs", count: 7 },
      { collection: "Contracts", count: 2 },
    ],
  },
];

const collectionsOf = (library: string): readonly Collection[] =>
  Option.match(
    Array.findFirst(LIBRARIES, (entry) => entry.library === library),
    { onNone: () => [], onSome: ({ collections }) => collections }
  );

const asideView = (
  model: Model,
  toggle: Html,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const collections = collectionsOf(model.library);

  return [
    Panel.view(
      {
        id: "sample-rail-collections",
        title: model.library,
        meta: `${collections.length}`,
        lead: [toggle],
        shelf: [
          SelectField.view(
            {
              id: "sample-rail-library",
              label: "Library",
              value: model.library,
              onChange: (library) => Message.ChangedLibrary({ library }),
              options: LIBRARIES.map(({ library }) => ({
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
              places: collections.map(({ collection, count }) => ({
                id: collection,
                label: collection,
                count,
                isCurrent: collection === model.collection,
                onSelect: Message.SelectedCollection({ collection }),
              })),
            },
            h
          ),
        ],
        foot: [h.span([h.Class("note-line")], ["Sample collections."])],
      },
      h
    ),
  ];
};

const deckView = (
  model: Model,
  openButton: Html,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("deck")],
    [
      openButton,
      Panel.view(
        {
          id: "sample-rail-deck",
          title: model.collection,
          body: [h.p([], [`What is in ${model.collection} (sample).`])],
        },
        h
      ),
    ]
  );

export const view = defineView<Model, Message>((model, h): Html =>
  specView(
    "the rail beside its deck: its list scrolls under the head, its bar's first glyph folds it to the bar and back, and dragging its right edge, or ← → on it, sizes it; at 900px and under, its button opens the same element as a drawer",
    [
      h.div(
        [h.Class("spec-railed")],
        [
          h.submodel({
            slotId: Rail.id(model.rail),
            model: model.rail,
            view: Rail.view,
            viewInputs: {
              label: "collections",
              maybeWidth: model.maybeRailWidth,
              isHidden: model.isRailHidden,
              maybeToggleKeyHint: Option.none(),
              toAsideView: (toggle) => asideView(model, toggle, h),
              toDeckView: (openButton) => deckView(model, openButton, h),
            },
            toParentMessage: (message) => Message.GotRailMessage({ message }),
          }),
        ]
      ),
    ],
    h
  )
);
