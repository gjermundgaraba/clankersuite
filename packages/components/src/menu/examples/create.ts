import { Group, KeyHint, Menu, Tag } from "@gjermundgaraba/components";
import { Glyph } from "@gjermundgaraba/icons";
import { Array, Effect, Option, Schema } from "effect";
import { Command, Dom, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Area = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  count: Schema.Finite,
});

type Area = typeof Area.Type;

export const Model = Schema.Struct({
  platform: KeyHint.KeyPlatform,
  create: Menu.Model,
  areaPicker: Menu.Model,
  area: Area,
  maybeLastMade: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  GotCreateMessage: { message: Menu.Message },
  GotAreaPickerMessage: { message: Menu.Message },
  PressedNewTaskKey: {},
});

export type Message = typeof Message.Type;

const NEW_TASK_KEYS = "N";

const OPERATIONS: Area = { id: "operations", title: "Operations", count: 12 };

const AREAS: readonly Area[] = [
  OPERATIONS,
  { id: "research", title: "Research", count: 4 },
  { id: "writing", title: "Writing", count: 7 },
];

export const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: {
    platform: "Other",
    create: Menu.init({ id: "create-menu" }),
    areaPicker: Menu.init({ id: "area-menu" }),
    area: OPERATIONS,
    maybeLastMade: Option.none(),
  },
  commands: [DetectKeyPlatform()],
});

const createItems = (model: Model): readonly Menu.Item[] => [
  Menu.action({
    id: "task",
    label: "Task",
    keyHint: { keys: NEW_TASK_KEYS, platform: model.platform },
  }),
  Menu.action({ id: "area", label: "Area" }),
];

const areaItems = (model: Model): readonly Menu.Item[] =>
  Array.map(AREAS, (area) =>
    Menu.radio({
      id: area.id,
      label: area.title,
      isChecked: model.area.id === area.id,
    })
  );

const foldCreate = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.create),
  write: (model: Model, create: Menu.Model): Model =>
    modifyFields(model, { create: () => create }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotCreateMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({
        model: modifyFields(model, { maybeLastMade: () => Option.some(id) }),
      }),
    Toggled: () => (model) => ({ model }),
  }),
});

const foldAreaPicker = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.areaPicker),
  write: (model: Model, areaPicker: Menu.Model): Model =>
    modifyFields(model, { areaPicker: () => areaPicker }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotAreaPickerMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) =>
        Option.match(
          Array.findFirst(AREAS, (area) => area.id === id),
          {
            onNone: () => ({ model }),
            onSome: (area) => ({
              model: modifyFields(model, { area: () => area }),
            }),
          }
        ),
    Toggled: () => (model) => ({ model }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    GotCreateMessage: ({ message: menuMessage }) =>
      foldCreate(model, menuMessage),
    GotAreaPickerMessage: ({ message: menuMessage }) =>
      foldAreaPicker(model, menuMessage),
    PressedNewTaskKey: () => ({
      model: modifyFields(model, { maybeLastMade: () => Option.some("task") }),
    }),
  });

const isAnyMenuOpen = (model: Model): boolean =>
  Menu.isOpen(model.create) || Menu.isOpen(model.areaPicker);

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
  newTaskKey: entry(
    { isMenuOpen: Schema.Boolean },
    {
      modelToDependencies: (model) => ({ isMenuOpen: isAnyMenuOpen(model) }),
      dependenciesToStream: ({ isMenuOpen }) =>
        Dom.streamFromKeyBindings<Message>({
          bindings: [
            {
              keys: NEW_TASK_KEYS,
              isEnabled: !isMenuOpen,
              mapEvent: () => Message.PressedNewTaskKey(),
            },
          ],
        }),
    }
  ),
}));

const areaToggleView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { area } = model;

  return h.submodel({
    slotId: Menu.id(model.areaPicker),
    model: model.areaPicker,
    view: Menu.view,
    viewInputs: {
      label: `Select area: ${area.title}`,
      items: areaItems(model),
      variant: "Primary",
      toggleContent: [
        Glyph.view({ name: "folder" }, h),
        h.span([], [area.title]),
        Tag.view(
          { label: `${area.count}`, full: `${area.count} in ${area.title}` },
          h
        ),
        Glyph.view({ name: "caret-down" }, h),
      ],
    },
    toParentMessage: (message) => Message.GotAreaPickerMessage({ message }),
  });
};

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        h.submodel({
          slotId: Menu.id(model.create),
          model: model.create,
          view: Menu.view,
          viewInputs: { label: "New", items: createItems(model) },
          toParentMessage: (message) => Message.GotCreateMessage({ message }),
        }),
        areaToggleView(model, h),
        ...Option.toArray(
          Option.map(model.maybeLastMade, (id) =>
            h.span([], [`new ${id} in ${model.area.title}`])
          )
        ),
      ],
    },
    h
  );
