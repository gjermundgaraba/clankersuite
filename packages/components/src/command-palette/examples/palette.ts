import {
  Button,
  CommandPalette,
  Group,
  KeyHint,
  LiveRegion,
  Notice,
  Stack,
  Toast,
} from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema } from "effect";
import { Command, Dom, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  platform: KeyHint.KeyPlatform,
  palette: CommandPalette.Model,
  toasts: Toast.Model,
  status: Schema.String,
  place: Schema.String,
  maybeRefusal: Schema.Option(Schema.String),
  maybeLastRun: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  ClickedOpen: {},
  ClickedOpenStatus: {},
  PressedPaletteKey: {},
  PressedEditKey: {},
  GotPaletteMessage: { message: CommandPalette.Message },
  GotToastsMessage: { message: Toast.Message },
  SucceededApplyPick: { commandId: Schema.String, choiceId: Schema.String },
  FailedApplyPick: { choiceId: Schema.String, reason: Schema.String },
});

export type Message = typeof Message.Type;

const PALETTE_KEYS = "Mod+K";
const EDIT_KEYS = "E";
const SCOPE = "Renew the certificate";

export const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: {
    platform: "Other",
    palette: CommandPalette.init({ id: "palette-example" }),
    toasts: Toast.init({ id: "palette-example-toasts" }),
    status: "todo",
    place: "projects",
    maybeRefusal: Option.none(),
    maybeLastRun: Option.none(),
  },
  commands: [DetectKeyPlatform()],
});

const statusPage = (current: string): CommandPalette.Page => ({
  title: "Status",
  current,
  choices: [
    { id: "inbox", label: "Inbox" },
    { id: "todo", label: "To do" },
    { id: "doing", label: "In progress" },
    { id: "done", label: "Done" },
  ],
});

const movePage = (current: string): CommandPalette.Page => ({
  title: "Move to",
  current,
  find: "type a place",
  choices: [
    { id: "projects", label: "Projects", glyph: "folder", level: 1 },
    {
      id: "website",
      label: "Website",
      glyph: "folder",
      level: 2,
      hint: "Projects",
    },
    {
      id: "launch",
      label: "Launch",
      glyph: "folder",
      level: 3,
      hint: "Projects / Website",
    },
    { id: "someday", label: "Someday", glyph: "folder", level: 1 },
    {
      id: "garden",
      label: "Garden",
      glyph: "folder",
      level: 2,
      hint: "Someday",
    },
    {
      id: "archive",
      label: "Archive",
      glyph: "archive",
      level: 1,
      hint: "read-only",
    },
  ],
});

const commands = (model: Model): readonly CommandPalette.Command[] => [
  {
    id: "edit",
    label: "Edit item",
    group: "Item",
    hint: KeyHint.keyLabel(EDIT_KEYS, model.platform),
  },
  {
    id: "status",
    label: "Change status",
    group: "Item",
    page: statusPage(model.status),
  },
  { id: "move", label: "Move to", group: "Item", page: movePage(model.place) },
  {
    id: "share",
    label: "Share",
    group: "Item",
    isDisabled: true,
    reason: "Offline",
  },
  {
    id: "garden-plan",
    label: "Plan the garden",
    group: "Titles",
    isAuthored: true,
    glyph: "page",
    keywords: "seeds beds spring",
  },
];

const PICK_TIME = Duration.millis(500);

export const ApplyPick = Command.define("ApplyPick", {
  args: { commandId: Schema.String, choiceId: Schema.String },
  messages: [Message.SucceededApplyPick, Message.FailedApplyPick],
  execute: ({ commandId, choiceId }) =>
    Effect.sleep(PICK_TIME).pipe(
      Effect.as(
        choiceId === "archive"
          ? Message.FailedApplyPick({
              choiceId,
              reason: "The archive is read-only here.",
            })
          : Message.SucceededApplyPick({ commandId, choiceId })
      )
    ),
});

const toastsFold = {
  read: (model: Model) => Option.some(model.toasts),
  write: (model: Model, toasts: Toast.Model): Model =>
    modifyFields(model, { toasts: () => toasts }),
  toParentMessage: (message: Toast.Message) =>
    Message.GotToastsMessage({ message }),
};

const showToast = Update.foldChild({ update: Toast.show, ...toastsFold });

const foldToasts = Update.foldChild({ update: Toast.update, ...toastsFold });

const ranCommand =
  (id: string): Update.Step<Model, Message> =>
  (model) => ({
    model: modifyFields(model, { maybeLastRun: () => Option.some(id) }),
  });

const paletteFold = {
  read: (model: Model) => Option.some(model.palette),
  write: (model: Model, palette: CommandPalette.Model): Model =>
    modifyFields(model, { palette: () => palette }),
  toParentMessage: (message: CommandPalette.Message) =>
    Message.GotPaletteMessage({ message }),
  foldOutMessage: CommandPalette.OutMessage.match<Update.Step<Model, Message>>({
    SelectedCommand: ({ id }) => ranCommand(id),
    SelectedChoice:
      ({ commandId, choiceId }) =>
      (model) => ({
        model: modifyFields(model, { maybeRefusal: () => Option.none() }),
        commands: [ApplyPick({ commandId, choiceId })],
      }),
    Closed: () => (model) => ({
      model: modifyFields(model, { maybeRefusal: () => Option.none() }),
    }),
  }),
};

const foldPalette = Update.foldChild({
  update: CommandPalette.update,
  ...paletteFold,
});

const openPalette = Update.foldChildStep({
  update: CommandPalette.open,
  ...paletteFold,
});

const openPaletteAt = Update.foldChild({
  update: CommandPalette.openAt,
  ...paletteFold,
});

const pickSucceeded = Update.foldChild({
  update: CommandPalette.pickSucceeded,
  ...paletteFold,
});

const pickFailed = Update.foldChild({
  update: CommandPalette.pickFailed,
  ...paletteFold,
});

const applied = (model: Model, commandId: string, choiceId: string): Model =>
  commandId === "status"
    ? modifyFields(model, { status: () => choiceId })
    : modifyFields(model, { place: () => choiceId });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    ClickedOpen: () => openPalette(model),
    PressedPaletteKey: () => openPalette(model),
    ClickedOpenStatus: () => openPaletteAt(model, { commandId: "status" }),
    PressedEditKey: () => ranCommand("edit")(model),
    GotPaletteMessage: ({ message: paletteMessage }) =>
      foldPalette(model, paletteMessage),
    GotToastsMessage: ({ message: toastsMessage }) =>
      foldToasts(model, toastsMessage),
    SucceededApplyPick: ({ commandId, choiceId }) =>
      pickSucceeded(applied(model, commandId, choiceId), choiceId),
    FailedApplyPick: ({ choiceId, reason }) =>
      Update.combine(
        modifyFields(model, { maybeRefusal: () => Option.some(reason) }),
        [
          (refusedModel) => pickFailed(refusedModel, choiceId),
          (refusedModel) =>
            showToast(refusedModel, {
              tone: "Error",
              title: "Not moved",
              body: reason,
            }),
        ]
      ),
  });

const paletteSubscriptions = Subscription.lift(
  CommandPalette.subscriptions("palette")
)<Model, Message>({
  read: (model) => Option.some(model.palette),
  toParentMessage: (message) => Message.GotPaletteMessage({ message }),
});

const keySubscriptions = Subscription.make<Model, Message>()((entry) => ({
  pageKeys: entry(
    { isPaletteOpen: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        isPaletteOpen: CommandPalette.isOpen(model.palette),
      }),
      dependenciesToStream: ({ isPaletteOpen }) =>
        Dom.streamFromKeyBindings<Message>({
          bindings: [
            {
              keys: PALETTE_KEYS,
              whileTyping: "Allow",
              isEnabled: !isPaletteOpen,
              mapEvent: () => Message.PressedPaletteKey(),
            },
            {
              keys: EDIT_KEYS,
              isEnabled: !isPaletteOpen,
              mapEvent: () => Message.PressedEditKey(),
            },
          ],
        }),
    }
  ),
}));

export const subscriptions = Subscription.aggregate(
  paletteSubscriptions,
  keySubscriptions
);

const refusalView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Option.match(model.maybeRefusal, {
    onNone: () => [],
    onSome: (reason) => [Notice.view({ tone: "Error", body: [reason] }, h)],
  });

const summary = (model: Model): string =>
  Option.match(model.maybeLastRun, {
    onNone: () => `status ${model.status}, in ${model.place}`,
    onSome: (id) => `ran ${id}; status ${model.status}, in ${model.place}`,
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place(
    [["Palette", CommandPalette.isOpen(model.palette)]],
    () =>
      LiveRegion.view(
        {
          toasts: h.submodel({
            slotId: Toast.id(model.toasts),
            model: model.toasts,
            view: Toast.view,
            toParentMessage: (message) => Message.GotToastsMessage({ message }),
          }),
        },
        h
      )
  );

  return h.div(
    [],
    [
      Stack.view(
        {
          body: [
            Group.view(
              {
                body: [
                  Button.view(
                    {
                      label: "commands",
                      glyph: "search",
                      keyHint: { keys: PALETTE_KEYS, platform: model.platform },
                      onClick: Message.ClickedOpen(),
                    },
                    h
                  ),
                  Button.view(
                    { label: "status", onClick: Message.ClickedOpenStatus() },
                    h
                  ),
                ],
              },
              h
            ),
            h.p([], [summary(model)]),
          ],
        },
        h
      ),
      h.submodel({
        slotId: CommandPalette.id(model.palette),
        model: model.palette,
        view: CommandPalette.view,
        viewInputs: {
          commands: commands(model),
          scope: SCOPE,
          noun: "title",
          toDetailView: () => refusalView(model, h),
          toLiveRegionView: liveRegion.toDialogView("Palette"),
        },
        toParentMessage: (message) => Message.GotPaletteMessage({ message }),
      }),
      ...liveRegion.toPageView(),
    ]
  );
};
