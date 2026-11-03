import {
  Button,
  Group,
  KeyHelp,
  KeyHint,
  LiveRegion,
} from "@gjermundgaraba/components";
import { Array, Effect, Option, Predicate, Schema } from "effect";
import { Command, Dom, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  platform: KeyHint.KeyPlatform,
  keyHelp: KeyHelp.Model,
  position: Schema.Finite,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  ClickedShowKeys: {},
  PressedHelpKey: {},
  PressedNextKey: {},
  PressedPreviousKey: {},
  PressedFirstKey: {},
  GotKeyHelpMessage: { message: KeyHelp.Message },
});

export type Message = typeof Message.Type;

const ITEM_COUNT = 5;
const NEXT_KEYS = "J";
const PREVIOUS_KEYS = "K";
const FIRST_KEYS = ["G", "G"] as const;

const bindings: readonly KeyHelp.Binding[] = [
  { keys: [NEXT_KEYS], group: "Move", does: "Next item" },
  { keys: [PREVIOUS_KEYS], group: "Move", does: "Previous item" },
  { keys: [FIRST_KEYS], group: "Move", does: "First item" },
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
    keyHelp: KeyHelp.init({ id: "key-help-example" }),
    position: 1,
  },
  commands: [DetectKeyPlatform()],
});

const keyHelpFold = {
  read: (model: Model) => Option.some(model.keyHelp),
  write: (model: Model, keyHelp: KeyHelp.Model): Model =>
    modifyFields(model, { keyHelp: () => keyHelp }),
  toParentMessage: (message: KeyHelp.Message) =>
    Message.GotKeyHelpMessage({ message }),
};

const foldKeyHelp = Update.foldChild({
  update: KeyHelp.update,
  ...keyHelpFold,
  foldOutMessage: KeyHelp.OutMessage.match<Update.Step<Model, Message>>({
    Closed: () => (model) => ({ model }),
  }),
});

const openKeyHelp = Update.foldChildStep({
  update: KeyHelp.open,
  ...keyHelpFold,
  foldOutMessage: () => (model: Model) => ({ model }),
});

const movedTo = (model: Model, position: number) => ({
  model: modifyFields(model, {
    position: () => Math.min(Math.max(position, 1), ITEM_COUNT),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    ClickedShowKeys: () => openKeyHelp(model),
    PressedHelpKey: () =>
      KeyHelp.isOpen(model.keyHelp) ? { model } : openKeyHelp(model),
    PressedNextKey: () => movedTo(model, model.position + 1),
    PressedPreviousKey: () => movedTo(model, model.position - 1),
    PressedFirstKey: () => movedTo(model, 1),
    GotKeyHelpMessage: ({ message: keyHelpMessage }) =>
      foldKeyHelp(model, keyHelpMessage),
  });

const helpKeyBindings = (
  isEnabled: boolean
): ReadonlyArray<Dom.KeyBinding<Message>> =>
  Array.fromOption(
    Option.map(
      Option.liftPredicate(KeyHelp.HELP_KEYS, Predicate.isString),
      (keys) => ({
        keys,
        isEnabled,
        mapEvent: () => Message.PressedHelpKey(),
      })
    )
  );

const pageKeyBindings = (
  isEnabled: boolean
): ReadonlyArray<Dom.KeyBinding<Message>> => [
  ...helpKeyBindings(isEnabled),
  { keys: NEXT_KEYS, isEnabled, mapEvent: () => Message.PressedNextKey() },
  {
    keys: PREVIOUS_KEYS,
    isEnabled,
    mapEvent: () => Message.PressedPreviousKey(),
  },
  { keys: FIRST_KEYS, isEnabled, mapEvent: () => Message.PressedFirstKey() },
];

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
  pageKeys: entry(
    { isKeyHelpOpen: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        isKeyHelpOpen: KeyHelp.isOpen(model.keyHelp),
      }),
      dependenciesToStream: ({ isKeyHelpOpen }) =>
        Dom.streamFromKeyBindings<Message>({
          bindings: pageKeyBindings(!isKeyHelpOpen),
        }),
    }
  ),
}));

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place(
    [["KeyHelp", KeyHelp.isOpen(model.keyHelp)]],
    () => LiveRegion.view({}, h)
  );

  return h.div(
    [],
    [
      Group.view(
        {
          body: [
            Button.view(
              {
                label: "show the keys",
                keyHint: { keys: KeyHelp.HELP_KEYS, platform: model.platform },
                onClick: Message.ClickedShowKeys(),
              },
              h
            ),
            h.span([], [`item ${model.position} of ${ITEM_COUNT}`]),
          ],
        },
        h
      ),
      h.submodel({
        slotId: KeyHelp.id(model.keyHelp),
        model: model.keyHelp,
        view: KeyHelp.view,
        viewInputs: {
          bindings,
          platform: model.platform,
          toLiveRegionView: liveRegion.toDialogView("KeyHelp"),
        },
        toParentMessage: (message) => Message.GotKeyHelpMessage({ message }),
      }),
      ...liveRegion.toPageView(),
    ]
  );
};
