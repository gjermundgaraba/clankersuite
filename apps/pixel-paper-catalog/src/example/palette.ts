import {
  Button,
  CommandPalette,
  KeyHint,
  Notice,
} from "@gjermundgaraba/pixel-paper";
import { Duration, Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  palette: CommandPalette.Model,
  status: Schema.String,
  place: Schema.String,
  maybeRefusal: Schema.Option(Schema.String),
  maybeLastRun: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedOpen: {},
  ClickedOpenStatus: {},
  GotPaletteMessage: { message: CommandPalette.Message },
  SucceededApplyPick: { commandId: Schema.String, choiceId: Schema.String },
  FailedApplyPick: { choiceId: Schema.String, reason: Schema.String },
});

export type Message = typeof Message.Type;

export const OutMessage = defineMessageUnion({
  RefusedPick: { reason: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

export const init = (): Model => ({
  palette: CommandPalette.init({ id: "palette" }),
  status: "todo",
  place: "projects",
  maybeRefusal: Option.none(),
  maybeLastRun: Option.none(),
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
      hint: "refuses (sample)",
    },
  ],
});

const commands = (
  model: Model,
  platform: KeyHint.KeyPlatform
): readonly CommandPalette.Command[] => [
  {
    id: "edit",
    label: "Edit item",
    group: "Item",
    hint: KeyHint.keyLabel("E", platform),
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
    reason: "Offline (sample)",
  },
  { id: "keys", label: "Keyboard shortcuts", group: "Anywhere", hint: "?" },
  {
    id: "renew",
    label: "Renew the certificate (sample)",
    group: "Titles",
    isAuthored: true,
    glyph: "page",
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
              reason: "The archive is read-only here (sample).",
            })
          : Message.SucceededApplyPick({ commandId, choiceId })
      )
    ),
});

const paletteFold = {
  read: (model: Model) => Option.some(model.palette),
  write: (model: Model, nextPalette: CommandPalette.Model): Model =>
    modifyFields(model, { palette: () => nextPalette }),
  toParentMessage: (message: CommandPalette.Message) =>
    Message.GotPaletteMessage({ message }),
  foldOutMessage: CommandPalette.OutMessage.match<Update.Step<Model, Message>>({
    SelectedCommand:
      ({ id }) =>
      (model) => ({
        model: modifyFields(model, { maybeLastRun: () => Option.some(id) }),
      }),
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

const foldPaletteOpen = Update.foldChildStep({
  update: CommandPalette.open,
  ...paletteFold,
});

const foldPaletteOpenAt = Update.foldChild({
  update: CommandPalette.openAt,
  ...paletteFold,
});

const foldPalettePickSucceeded = Update.foldChild({
  update: CommandPalette.pickSucceeded,
  ...paletteFold,
});

const foldPalettePickFailed = Update.foldChild({
  update: CommandPalette.pickFailed,
  ...paletteFold,
});

const applied = (model: Model, commandId: string, choiceId: string): Model =>
  commandId === "status"
    ? modifyFields(model, { status: () => choiceId })
    : modifyFields(model, { place: () => choiceId });

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedOpen: () => foldPaletteOpen(model),
      ClickedOpenStatus: () =>
        foldPaletteOpenAt(model, { commandId: "status" }),
      GotPaletteMessage: ({ message: paletteMessage }) =>
        foldPalette(model, paletteMessage),
      SucceededApplyPick: ({ commandId, choiceId }) =>
        foldPalettePickSucceeded(applied(model, commandId, choiceId), choiceId),
      FailedApplyPick: ({ choiceId, reason }) =>
        Update.withOutMessage(
          foldPalettePickFailed(
            modifyFields(model, { maybeRefusal: () => Option.some(reason) }),
            choiceId
          ),
          OutMessage.RefusedPick({ reason })
        ),
    }
  );

export const isDialogOpen = (model: Model): boolean =>
  CommandPalette.isOpen(model.palette);

export type ViewInputs = Readonly<{
  platform: KeyHint.KeyPlatform;
  toLiveRegionView?: (() => Html) | undefined;
}>;

const refusalView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Option.match(model.maybeRefusal, {
    onNone: () => [],
    onSome: (reason) => [Notice.view({ tone: "Error", body: [reason] }, h)],
  });

export const view = defineView<Model, Message, ViewInputs>(
  (model, { platform, toLiveRegionView }, h): Html =>
    h.div(
      [],
      [
        rowView(
          [
            specView(
              Option.match(model.maybeLastRun, {
                onNone: () =>
                  `the palette; status ${model.status}, in ${model.place} (sample)`,
                onSome: (id) =>
                  `the palette: ran ${id}; status ${model.status}, in ${model.place}`,
              }),
              [
                Button.view(
                  {
                    label: "commands",
                    glyph: "search",
                    onClick: Message.ClickedOpen(),
                  },
                  h
                ),
              ],
              h
            ),
            specView(
              "opened straight on a page; Back still leads to the commands",
              [
                Button.view(
                  { label: "status", onClick: Message.ClickedOpenStatus() },
                  h
                ),
              ],
              h
            ),
          ],
          h
        ),
        h.submodel({
          slotId: CommandPalette.id(model.palette),
          model: model.palette,
          view: CommandPalette.view,
          viewInputs: {
            commands: commands(model, platform),
            scope: "Renew the certificate (sample)",
            noun: "title",
            toDetailView: () => refusalView(model, h),
            toLiveRegionView,
          },
          toParentMessage: (message) => Message.GotPaletteMessage({ message }),
        }),
      ]
    )
);
