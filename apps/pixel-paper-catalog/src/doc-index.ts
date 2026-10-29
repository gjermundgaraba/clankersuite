import { Menu, Toc } from "@gjermundgaraba/pixel-paper";
import { Array, Filter, Option, Schema, Stream, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

export const Model = Schema.Struct({
  maybeCurrentId: Schema.Option(Schema.String),
  jumpMenu: Menu.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedReadingPosition: { id: Schema.String },
  GotJumpMenuMessage: { message: Menu.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  maybeCurrentId: Option.none(),
  jumpMenu: Menu.init({ id: "section-menu" }),
});

const foldJumpMenu = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.jumpMenu),
  write: (model: Model, nextJumpMenu: Menu.Model): Model =>
    modifyFields(model, { jumpMenu: () => nextJumpMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotJumpMenuMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected: () => (model) => ({ model }),
    Toggled: () => (model) => ({ model }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedReadingPosition: ({ id }) => ({
      model: modifyFields(model, { maybeCurrentId: () => Option.some(id) }),
    }),
    GotJumpMenuMessage: ({ message: menuMessage }) =>
      foldJumpMenu(model, menuMessage),
  });

const SECTION_SELECTOR = ".spec-stack > .spec-section";

const PIXELS = /^(?<amount>-?\d*\.?\d+)px$/u;

const readingPosition = (): Option.Option<string> => {
  const sections = Array.fromIterable(
    document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)
  );

  const padding = getComputedStyle(document.documentElement).scrollPaddingTop;

  return pipe(
    Option.fromNullishOr(PIXELS.exec(padding)?.groups?.["amount"]),
    Option.flatMap((amount) =>
      Array.findLast(
        sections,
        (section) => section.getBoundingClientRect().top <= Number(amount) + 1
      )
    ),
    Option.orElse(() => Array.head(sections)),
    Option.map(({ id }) => id)
  );
};

type SubscriptionConfig<ParentModel> = Readonly<{
  isActive: (model: ParentModel) => boolean;
  page: (model: ParentModel) => string;
}>;

const readingPositionEntry = <ParentModel, ParentMessage>(
  config: SubscriptionConfig<ParentModel> &
    Readonly<{ toMessage: (message: Message) => ParentMessage }>
) => ({
  dependenciesSchema: Schema.Struct({
    isActive: Schema.Boolean,
    page: Schema.String,
  }),
  modelToDependencies: (model: ParentModel) => ({
    isActive: config.isActive(model),
    page: config.page(model),
  }),
  dependenciesToStream: ({
    isActive,
  }: Readonly<{ isActive: boolean; page: string }>) =>
    isActive
      ? Stream.suspend(() =>
          Stream.concat(
            Stream.make(undefined),
            Stream.fromEventListener(window, "scroll", { passive: true })
          )
        ).pipe(
          Stream.filterMap(Filter.fromPredicateOption(readingPosition)),
          Stream.changes,
          Stream.map((id) =>
            config.toMessage(Message.UpdatedReadingPosition({ id }))
          )
        )
      : Stream.empty,
});

export const subscriptionsFor = <ParentModel, ParentMessage>(
  config: SubscriptionConfig<ParentModel> &
    Readonly<{ toMessage: (message: Message) => ParentMessage }>
) =>
  Subscription.make<ParentModel, ParentMessage>()(() => ({
    readingPosition: readingPositionEntry(config),
  }));

export type Entry = Readonly<{
  id: string;
  title: string;
}>;

const currentId = (
  model: Model,
  entries: readonly Entry[]
): Option.Option<string> =>
  Option.orElse(
    Option.filter(model.maybeCurrentId, (id) =>
      Array.some(entries, (entry) => entry.id === id)
    ),
    () => Option.map(Array.head(entries), ({ id }) => id)
  );

export type ViewConfig<ParentMessage> = Readonly<{
  label: string;
  entries: readonly Entry[];
  toParentMessage: (message: Message) => ParentMessage;
}>;

export const view = <ParentMessage>(
  model: Model,
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): readonly Html[] => {
  const { label, entries, toParentMessage } = config;
  const maybeCurrent = currentId(model, entries);

  const currentTitle = Option.match(
    Option.flatMap(maybeCurrent, (id) =>
      Array.findFirst(entries, (entry) => entry.id === id)
    ),
    { onNone: () => label, onSome: ({ title }) => title }
  );

  return [
    h.aside(
      [h.Class("spec-index")],
      [
        h.div(
          [h.Class("spec-index-head")],
          [
            h.span([], [label]),
            h.span([h.Class("spec-meta")], [`${entries.length}`]),
          ]
        ),
        Toc.view(
          {
            entries: Array.map(entries, ({ id, title }) => ({
              id,
              label: title,
              level: 2,
            })),
            maybeCurrentId: maybeCurrent,
          },
          h
        ),
      ]
    ),
    h.div(
      [h.Class("spec-jump")],
      [
        h.submodel({
          slotId: Menu.id(model.jumpMenu),
          model: model.jumpMenu,
          view: Menu.view,
          viewInputs: {
            label: `section · ${currentTitle}`,
            items: Array.map(entries, ({ id, title }) =>
              Menu.link({
                id,
                label: title,
                href: `#${id}`,
              })
            ),
          },
          toParentMessage: (message) =>
            toParentMessage(Message.GotJumpMenuMessage({ message })),
        }),
      ]
    ),
  ];
};
