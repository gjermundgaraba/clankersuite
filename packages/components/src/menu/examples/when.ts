import { Group, Menu } from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const When = Schema.Literals([
  "Focus",
  "This evening",
  "Tomorrow",
  "This weekend",
  "Next week",
  "Anytime",
  "Someday",
]);

type When = typeof When.Type;

export const Model = Schema.Struct({ menu: Menu.Model, when: When });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotMenuMessage: { message: Menu.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { menu: Menu.init({ id: "when-menu" }), when: "Focus" },
});

const whenItems = (model: Model): readonly Menu.Item[] => {
  const choice = (id: When, glyph: GlyphName, hint?: string) =>
    Menu.radio({
      id,
      label: id,
      glyph,
      isChecked: model.when === id,
      ...(hint === undefined ? {} : { hint }),
    });

  return [
    choice("Focus", "star"),
    choice("This evening", "moon"),
    choice("Tomorrow", "sun", "Thu 19 Nov"),
    choice("This weekend", "calendar", "Sat 21 Nov"),
    choice("Next week", "calendar", "Mon 23 Nov"),
    Menu.separator("later"),
    choice("Anytime", "layers"),
    choice("Someday", "archive"),
  ];
};

const isWhen = Schema.is(When);

const foldMenu = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model: Model, menu: Menu.Model): Model =>
    modifyFields(model, { menu: () => menu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotMenuMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({
        model: isWhen(id) ? modifyFields(model, { when: () => id }) : model,
      }),
    Toggled: () => (model) => ({ model }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotMenuMessage: ({ message: menuMessage }) => foldMenu(model, menuMessage),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        h.submodel({
          slotId: Menu.id(model.menu),
          model: model.menu,
          view: Menu.view,
          viewInputs: { label: "When", items: whenItems(model) },
          toParentMessage: (message) => Message.GotMenuMessage({ message }),
        }),
        h.span([], [model.when]),
      ],
    },
    h
  );
