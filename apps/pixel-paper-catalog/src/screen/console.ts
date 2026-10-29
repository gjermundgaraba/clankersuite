import {
  Announcer,
  Button,
  Chip,
  ConfirmDialog,
  Format,
  History,
  Meter,
  Notice,
  Panel,
  PropsList,
  Secret,
  Stat,
  Table,
} from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import type { CopyView } from "../copies.ts";
import {
  CHECKS,
  CLIENTS,
  Client,
  ISSUER,
  METERS,
  SECRET,
  TODAY,
  isNearLimit,
} from "../sample.ts";

export const Model = Schema.Struct({
  clients: Schema.Array(Client),
  isSecretShown: Schema.Boolean,
  isSecretStored: Schema.Boolean,
  maybeDropId: Schema.Option(Schema.String),
  dropConfirm: ConfirmDialog.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedStored: {},
  ClickedRotate: { name: Schema.String },
  ClickedEnable: { name: Schema.String },
  ClickedDelete: { clientId: Schema.String },
  ClickedCheckNow: {},
  GotDropConfirmMessage: { message: ConfirmDialog.Message },
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  clients: CLIENTS,
  isSecretShown: true,
  isSecretStored: false,
  maybeDropId: Option.none(),
  dropConfirm: ConfirmDialog.init({ id: "console-drop-client" }),
});

type UpdateReturn = Update.Return<Model, Message>;

const clientName = (model: Model, clientId: string): string =>
  Option.match(
    Array.findFirst(model.clients, ({ id }) => id === clientId),
    { onNone: () => "client", onSome: ({ name }) => name }
  );

const dropped = (model: Model): UpdateReturn =>
  Option.match(model.maybeDropId, {
    onNone: () => ({ model }),
    onSome: (clientId) => ({
      model: modifyFields(model, {
        clients: Array.filter(({ id }) => id !== clientId),
        maybeDropId: () => Option.none(),
      }),
      commands: [
        Announcer.Announce({ text: `${clientName(model, clientId)} deleted.` }),
      ],
    }),
  });

const dropConfirmSlot = {
  read: (model: Model) => Option.some(model.dropConfirm),
  write: (model: Model, nextDropConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { dropConfirm: () => nextDropConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotDropConfirmMessage({ message }),
};

const foldDropConfirmOpen = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...dropConfirmSlot,
});

const foldDropConfirmClose = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...dropConfirmSlot,
});

const foldDropConfirm = Update.foldChild({
  update: ConfirmDialog.update,
  ...dropConfirmSlot,
  foldOutMessage: ConfirmDialog.OutMessage.match<Update.Step<Model, Message>>({
    Confirmed: () => (model) =>
      Update.combine(model, [foldDropConfirmClose, dropped]),
    Cancelled: () => (model) => ({
      model: modifyFields(model, { maybeDropId: () => Option.none() }),
    }),
  }),
});

export const markSecretStored = (model: Model): Model =>
  modifyFields(model, { isSecretStored: () => true });

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedStored: () => ({
      model: modifyFields(model, { isSecretShown: () => false }),
      commands: [
        Announcer.Announce({
          text: model.isSecretStored
            ? "Key dismissed."
            : "Key dismissed without copying.",
        }),
      ],
    }),
    ClickedRotate: ({ name }) => ({
      model,
      commands: [Announcer.Announce({ text: `${name} rotated.` })],
    }),
    ClickedEnable: ({ name }) => ({
      model,
      commands: [Announcer.Announce({ text: `${name} enabled.` })],
    }),
    ClickedDelete: ({ clientId }) =>
      foldDropConfirmOpen(
        modifyFields(model, { maybeDropId: () => Option.some(clientId) })
      ),
    ClickedCheckNow: () => ({
      model,
      commands: [Announcer.Announce({ text: "Checked." })],
    }),
    GotDropConfirmMessage: ({ message: confirmMessage }) =>
      foldDropConfirm(model, confirmMessage),
    CompletedAnnounce: () => ({ model }),
  });

export const isDialogOpen = (model: Model): boolean =>
  ConfirmDialog.isOpen(model.dropConfirm);

const allowanceMeters = <Message>(
  h: HtmlBuilder<Message>
): readonly Meter.MeterConfig[] =>
  Array.map(METERS, (allowance) => ({
    id: `allowance-${allowance.id}`,
    label: allowance.name,
    detail: [allowance.plan],
    value: allowance.used,
    max: allowance.limit,
    unit: allowance.unit,
    full: "limit reached",
    foot: [h.span([], [allowance.resets]), h.span([], [allowance.checked])],
  }));

export type ViewInputs = Readonly<{
  toLiveRegionView?: (() => Html) | undefined;
  toCopyView: CopyView;
}>;

const count = (total: number, one: string, many: string): string =>
  `${total} ${total === 1 ? one : many}`;

const fullMeters = Array.filter(
  METERS,
  ({ used, limit }) => used >= limit
).length;

const nearMeters = Array.filter(METERS, isNearLimit).length - fullMeters;

const storedRowView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("save-row")],
    [
      h.span(
        [h.Class("push")],
        [
          Button.view(
            {
              label: "I've stored it",
              variant: "Primary",
              onClick: Message.ClickedStored(),
            },
            h
          ),
        ]
      ),
    ]
  );

const secretView = (
  model: Model,
  toCopyView: CopyView,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  model.isSecretShown
    ? [
        Panel.view(
          {
            id: "console-new-key",
            title: "New key",
            meta: "shown once",
            body: [
              Notice.view(
                {
                  glyph: "key",
                  title: "Store this secret now",
                  body: [
                    "The key for build-runner. It is shown once: after you dismiss it, only its prefix remains here.",
                  ],
                },
                h
              ),
              Secret.view(
                {
                  value: SECRET,
                  label: "build-runner key",
                  actions: [
                    toCopyView("console-secret", {
                      text: SECRET,
                      label: "Copy build-runner key",
                    }),
                  ],
                },
                h
              ),
              storedRowView(h),
            ],
          },
          h
        ),
      ]
    : [];

const todayView = (h: HtmlBuilder<Message>): Html =>
  Stat.listView(
    {
      stats: [
        { label: "Requests", maybeValue: Option.some(TODAY.requests) },
        { label: "Sign-ins", maybeValue: Option.some(TODAY.signIns) },
        { label: "Failed sign-ins", maybeValue: Option.some(TODAY.failed) },
        { label: "Clients", maybeValue: Option.some(TODAY.clients) },
      ],
    },
    h
  );

const clientColumns = (
  h: HtmlBuilder<Message>
): Table.ViewConfig<Client>["columns"] => [
  {
    key: "name",
    header: "Client",
    cell: ({ name }) => [h.span([h.Class("name")], [name])],
  },
  {
    key: "kind",
    header: "Kind",
    cell: ({ kind }) => [Chip.view({ label: kind }, h)],
  },
  { key: "grants", header: "Grants", cell: ({ grants }) => [grants] },
  {
    key: "seen",
    header: "Last seen",
    cell: ({ seen }) => [h.span([h.Class("age")], [seen])],
  },
  {
    key: "uses",
    header: "Uses",
    cell: ({ uses }) => [uses.toLocaleString(Format.LOCALE)],
  },
];

const clientActions =
  (h: HtmlBuilder<Message>) =>
  (client: Client): readonly Html[] => [
    client.isOff
      ? Button.view(
          {
            label: "enable",
            isSmall: true,
            onClick: Message.ClickedEnable({ name: client.name }),
          },
          h
        )
      : Button.view(
          {
            label: "rotate",
            isSmall: true,
            onClick: Message.ClickedRotate({ name: client.name }),
          },
          h
        ),
    Button.view(
      {
        label: "delete",
        isSmall: true,
        onClick: Message.ClickedDelete({ clientId: client.id }),
        attributes: [h.AriaLabel(`delete ${client.name}`)],
      },
      h
    ),
  ];

const issuerView = (toCopyView: CopyView, h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: Array.map(ISSUER, ({ label, value, copyKey }) => ({
        label,
        value: [value],
        isCode: copyKey !== undefined,
        actions:
          copyKey === undefined
            ? []
            : [toCopyView(copyKey, { text: value, label: `Copy ${label}` })],
      })),
    },
    h
  );

const clientsPanelView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "console-clients",
      title: "Clients",
      meta: `${model.clients.length}`,
      isFlush: true,
      body: [
        Table.view(
          {
            label: "Clients",
            columns: clientColumns(h),
            rows: model.clients,
            rowKey: ({ id }) => id,
            actions: clientActions(h),
          },
          h
        ),
      ],
    },
    h
  );

const usagePanelView = (h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "console-usage",
      title: "Usage",
      meta: count(METERS.length, "allowance", "allowances"),
      isFlush: true,
      body: [Meter.listView({ meters: allowanceMeters(h) }, h)],
      foot: [
        h.span(
          [h.Class("note-line")],
          [`${nearMeters} near its limit, ${fullMeters} at it.`]
        ),
        h.span(
          [h.Class("push")],
          [
            Button.view(
              {
                label: "check now",
                isSmall: true,
                onClick: Message.ClickedCheckNow(),
              },
              h
            ),
          ]
        ),
      ],
    },
    h
  );

const dropConfirmView = (
  model: Model,
  toLiveRegionView: ViewInputs["toLiveRegionView"],
  h: HtmlBuilder<Message>
): Html => {
  const dropName = Option.match(model.maybeDropId, {
    onNone: () => "client",
    onSome: (clientId) => clientName(model, clientId),
  });

  return h.submodel({
    slotId: ConfirmDialog.id(model.dropConfirm),
    model: model.dropConfirm,
    view: ConfirmDialog.view,
    viewInputs: {
      title: "Delete",
      question: `Delete ${dropName}?`,
      body: ["Its keys stop working at once. This cannot be undone."],
      label: "delete",
      isDanger: true,
      toLiveRegionView,
    },
    toParentMessage: (message) => Message.GotDropConfirmMessage({ message }),
  });
};

export const view = defineView<Model, Message, ViewInputs>(
  (model, { toLiveRegionView, toCopyView }, h) =>
    h.div(
      [h.Class("spec-screen")],
      [
        ...secretView(model, toCopyView, h),
        Panel.view(
          {
            id: "console-today",
            title: "Today",
            meta: "since midnight",
            isFlush: true,
            body: [todayView(h)],
          },
          h
        ),
        clientsPanelView(model, h),
        Panel.view(
          {
            id: "console-issuer",
            title: "Issuer",
            meta: "sample values",
            body: [issuerView(toCopyView, h)],
          },
          h
        ),
        usagePanelView(h),
        Panel.view(
          {
            id: "console-checks",
            title: "Checks",
            meta: `latest ${CHECKS.length}`,
            body: [
              History.view(
                { entries: CHECKS, variant: "Checks", label: "Checks" },
                h
              ),
            ],
          },
          h
        ),
        dropConfirmView(model, toLiveRegionView, h),
      ]
    )
);
