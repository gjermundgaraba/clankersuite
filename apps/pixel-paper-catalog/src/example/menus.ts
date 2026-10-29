import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import { Glyph, Menu, Tag } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

const Scheme = Schema.Literals(["System", "Paper", "Plum"]);

type Scheme = typeof Scheme.Type;

const Area = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  count: Schema.Finite,
});

type Area = typeof Area.Type;

export const Model = Schema.Struct({
  settings: Menu.Model,
  create: Menu.Model,
  areaPicker: Menu.Model,
  rowActions: Schema.Array(Menu.Model),
  scheme: Scheme,
  isDense: Schema.Boolean,
  area: Area,
  pinnedIds: Schema.Array(Schema.String),
  maybeLastAction: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotSettingsMessage: { message: Menu.Message },
  GotCreateMessage: { message: Menu.Message },
  GotAreaPickerMessage: { message: Menu.Message },
  GotRowActionsMessage: { rowId: Schema.String, message: Menu.Message },
});

export type Message = typeof Message.Type;

const OPERATIONS: Area = { id: "operations", title: "Operations", count: 12 };

const AREAS: readonly Area[] = [
  OPERATIONS,
  { id: "research", title: "Research", count: 4 },
  { id: "writing", title: "Writing", count: 7 },
];

const ROWS: ReadonlyArray<Readonly<{ id: string; name: string }>> = [
  { id: "row-notes", name: "field-notes.md" },
  { id: "row-budget", name: "budget.csv" },
];

const rowActionsId = (rowId: string): string => `${rowId}-actions`;

export const init = (): Model => ({
  settings: Menu.init({ id: "settings-menu" }),
  create: Menu.init({ id: "new-menu" }),
  areaPicker: Menu.init({ id: "area-menu" }),
  rowActions: Array.map(ROWS, (row) => Menu.init({ id: rowActionsId(row.id) })),
  scheme: "System",
  isDense: false,
  area: OPERATIONS,
  pinnedIds: [],
  maybeLastAction: Option.none(),
});

const SCHEMES: readonly Scheme[] = ["System", "Paper", "Plum"];

const settingsItems = (model: Model): readonly Menu.Item[] => [
  Menu.group(
    "Appearance",
    Array.map(SCHEMES, (scheme) =>
      Menu.radio({
        id: scheme,
        label: scheme,
        isChecked: model.scheme === scheme,
      })
    )
  ),
  Menu.group("Layout", [
    Menu.check({ id: "dense", label: "Dense rows", isChecked: model.isDense }),
  ]),
  Menu.group("Account", [
    Menu.action({ id: "export", label: "Export data", isDisabled: true }),
    Menu.link({ id: "sign-out", label: "Sign out", href: "#menus" }),
  ]),
];

const createItems = (platform: KeyHint.KeyPlatform): readonly Menu.Item[] => [
  Menu.action({ id: "task", label: "Task", keyHint: { keys: "n", platform } }),
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

const isScheme = Schema.is(Scheme);

const recordAction =
  (action: string): Update.Step<Model, Message> =>
  (model) => ({
    model: modifyFields(model, { maybeLastAction: () => Option.some(action) }),
  });

const togglePin =
  (rowId: string): Update.Step<Model, Message> =>
  (model) => ({
    model: modifyFields(model, {
      pinnedIds: (pinnedIds) =>
        Array.contains(pinnedIds, rowId)
          ? Array.filter(pinnedIds, (pinnedId) => pinnedId !== rowId)
          : Array.append(pinnedIds, rowId),
      maybeLastAction: () => Option.some(`pin ${rowId}`),
    }),
  });

const foldSettings = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model: Model, nextSettings: Menu.Model): Model =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotSettingsMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({
        model: isScheme(id)
          ? modifyFields(model, { scheme: () => id })
          : modifyFields(model, { maybeLastAction: () => Option.some(id) }),
      }),
    Toggled: () => (model) => ({
      model: modifyFields(model, { isDense: (isDense) => !isDense }),
    }),
  }),
});

const foldCreate = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.create),
  write: (model: Model, nextCreate: Menu.Model): Model =>
    modifyFields(model, { create: () => nextCreate }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotCreateMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected: ({ id }) => recordAction(`new ${id}`),
    Toggled: ({ id }) => recordAction(id),
  }),
});

const foldAreaPicker = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.areaPicker),
  write: (model: Model, nextPicker: Menu.Model): Model =>
    modifyFields(model, { areaPicker: () => nextPicker }),
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
    Toggled: ({ id }) => recordAction(id),
  }),
});

const foldRowActionsOutMessage = (rowId: string) =>
  Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected: ({ id }) => recordAction(`${id} ${rowId}`),
    Toggled: () => togglePin(rowId),
  });

const foldRowActions = Update.foldChildAt({
  update: Menu.update,
  readAt: (model: Model, rowId: string) =>
    Array.findFirst(
      model.rowActions,
      (menu) => Menu.id(menu) === rowActionsId(rowId)
    ),
  writeAt: (model, rowId, nextMenu) =>
    modifyFields(model, {
      rowActions: Array.map((menu) =>
        Menu.id(menu) === rowActionsId(rowId) ? nextMenu : menu
      ),
    }),
  toParentMessage: (rowId, message) =>
    Message.GotRowActionsMessage({ rowId, message }),
  foldOutMessage: foldRowActionsOutMessage,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSettingsMessage: ({ message: menuMessage }) =>
      foldSettings(model, menuMessage),
    GotCreateMessage: ({ message: menuMessage }) =>
      foldCreate(model, menuMessage),
    GotAreaPickerMessage: ({ message: menuMessage }) =>
      foldAreaPicker(model, menuMessage),
    GotRowActionsMessage: ({ rowId, message: menuMessage }) =>
      foldRowActions(model, rowId, menuMessage),
  });

export type ViewInputs = Readonly<{ platform: KeyHint.KeyPlatform }>;

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

const sampleRowsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.ul(
    [h.Class("spec-rows")],
    Array.map(ROWS, (row) =>
      h.keyed("li")(
        row.id,
        [h.Class("spec-inline")],
        [
          h.span(
            [],
            [
              `${row.name}${Array.contains(model.pinnedIds, row.id) ? " · pinned" : ""}`,
            ]
          ),
          ...Option.toArray(
            Option.map(
              Array.findFirst(
                model.rowActions,
                (menu) => Menu.id(menu) === rowActionsId(row.id)
              ),
              (menu) =>
                h.submodel({
                  slotId: Menu.id(menu),
                  model: menu,
                  view: Menu.view,
                  viewInputs: {
                    label: `Actions: ${row.name}`,
                    glyph: "more",
                    isQuiet: true,
                    align: "End",
                    items: rowItems(model, row.id),
                  },
                  toParentMessage: (message) =>
                    Message.GotRowActionsMessage({
                      rowId: row.id,
                      message,
                    }),
                })
            )
          ),
        ]
      )
    )
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    rowView(
      [
        specView(
          `radio, check and link rows in groups; scheme ${model.scheme.toLowerCase()}${model.isDense ? ", dense rows" : ""} (sample)`,
          [
            h.submodel({
              slotId: Menu.id(model.settings),
              model: model.settings,
              view: Menu.view,
              viewInputs: { label: "Settings", items: settingsItems(model) },
              toParentMessage: (message) =>
                Message.GotSettingsMessage({ message }),
            }),
          ],
          h
        ),
        specView(
          `actions, and a composed primary toggle; area ${model.area.title.toLowerCase()} (sample)`,
          [
            h.div(
              [h.Class("spec-inline")],
              [
                h.submodel({
                  slotId: Menu.id(model.create),
                  model: model.create,
                  view: Menu.view,
                  viewInputs: {
                    label: "New",
                    items: createItems(viewInputs.platform),
                  },
                  toParentMessage: (message) =>
                    Message.GotCreateMessage({ message }),
                }),
                areaToggleView(model, h),
              ]
            ),
          ],
          h
        ),
        specView(
          Option.match(model.maybeLastAction, {
            onNone: () => "each row's more menu",
            onSome: (action) => `each row's more menu: ${action}`,
          }),
          [sampleRowsView(model, h)],
          h
        ),
      ],
      h
    )
);
