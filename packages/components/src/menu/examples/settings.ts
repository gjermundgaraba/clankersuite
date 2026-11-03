import { Group, Menu } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Palette = Schema.Literals(["System", "Paper", "Plum"]);

type Palette = typeof Palette.Type;

export const Model = Schema.Struct({
  settings: Menu.Model,
  palette: Palette,
  isDense: Schema.Boolean,
  maybeLastAction: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotSettingsMessage: { message: Menu.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    settings: Menu.init({ id: "settings-menu" }),
    palette: "System",
    isDense: false,
    maybeLastAction: Option.none(),
  },
});

const settingsItems = (model: Model): readonly Menu.Item[] => [
  Menu.group(
    "Appearance",
    Array.map(Palette.literals, (palette) =>
      Menu.radio({
        id: palette,
        label: palette,
        isChecked: model.palette === palette,
      })
    )
  ),
  Menu.group("Layout", [
    Menu.check({ id: "dense", label: "Dense rows", isChecked: model.isDense }),
  ]),
  Menu.group("Account", [
    Menu.action({ id: "export", label: "Export data", isDisabled: true }),
    Menu.link({ id: "sign-out", label: "Sign out", href: "#sign-out" }),
  ]),
];

const isPalette = Schema.is(Palette);

const foldSettings = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model: Model, settings: Menu.Model): Model =>
    modifyFields(model, { settings: () => settings }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotSettingsMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({
        model: isPalette(id)
          ? modifyFields(model, { palette: () => id })
          : modifyFields(model, { maybeLastAction: () => Option.some(id) }),
      }),
    Toggled: () => (model) => ({
      model: modifyFields(model, { isDense: (isDense) => !isDense }),
    }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSettingsMessage: ({ message: menuMessage }) =>
      foldSettings(model, menuMessage),
  });

const summary = (model: Model): string =>
  [
    `${model.palette} palette`,
    ...(model.isDense ? ["dense rows"] : []),
    ...Option.toArray(Option.map(model.maybeLastAction, (id) => `ran ${id}`)),
  ].join(", ");

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        h.submodel({
          slotId: Menu.id(model.settings),
          model: model.settings,
          view: Menu.view,
          viewInputs: { label: "Settings", items: settingsItems(model) },
          toParentMessage: (message) => Message.GotSettingsMessage({ message }),
        }),
        h.span([], [summary(model)]),
      ],
    },
    h
  );
