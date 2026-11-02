import { Effect, Schema } from "effect";
import { Story } from "foldkit";
import * as Command from "foldkit/command";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { describe, expect, it } from "vite-plus/test";

import { defineCopies } from "./define-copies.ts";

const ButtonModel = Schema.Struct({
  id: Schema.String,
  isHeld: Schema.Boolean,
});

type ButtonModel = typeof ButtonModel.Type;

const ButtonMessage = defineMessageUnion({
  ClickedCopy: {},
  CompletedSettle: {},
});

type ButtonMessage = typeof ButtonMessage.Type;

const Settle = Command.define("Settle", {
  messages: [ButtonMessage.CompletedSettle],
  execute: Effect.succeed(ButtonMessage.CompletedSettle()),
});

const updateButton = (model: ButtonModel, message: ButtonMessage) =>
  ButtonMessage.match<Update.Return<ButtonModel, ButtonMessage>>(message, {
    ClickedCopy: () => ({
      model: modifyFields(model, { isHeld: () => true }),
      commands: [Settle()],
    }),
    CompletedSettle: () => ({
      model: modifyFields(model, { isHeld: () => false }),
    }),
  });

const Copies = defineCopies(["install", "usage"], {
  Model: ButtonModel,
  Message: ButtonMessage,
  init: ({ id }) => ({ id, isHeld: false }),
  update: updateButton,
  embed: (button, label: string, _toParentMessage, h) =>
    h.button([h.Id(button.id)], [label]),
});

type Model = Readonly<{ copies: typeof Copies.Model.Type }>;

const Message = defineMessageUnion({
  GotCopyButtonMessage: { id: Copies.Key, message: ButtonMessage },
});

type Message = typeof Message.Type;

const foldCopies = Copies.fold({
  read: (model: Model) => model.copies,
  write: (model: Model, nextCopies): Model =>
    modifyFields(model, { copies: () => nextCopies }),
  toParentMessage: (id, message) =>
    Message.GotCopyButtonMessage({ id, message }),
});

const update = (model: Model, message: Message) =>
  Message.match(message, {
    GotCopyButtonMessage: ({ id, message: buttonMessage }) =>
      foldCopies(model, id, buttonMessage),
  });

describe("Copies.fold", () => {
  it("runs the button a key names and sends what its Command answers back to that key", () => {
    Story.story(
      update,
      Story.given({ copies: Copies.init() }),
      Story.message(
        Message.GotCopyButtonMessage({
          id: "usage",
          message: ButtonMessage.ClickedCopy(),
        })
      ),
      Story.model((model) => {
        expect(model.copies).toStrictEqual({
          install: { id: "copy-install", isHeld: false },
          usage: { id: "copy-usage", isHeld: true },
        });
      }),
      Story.Command.resolve(Settle, ButtonMessage.CompletedSettle()),
      Story.model((model) => {
        expect(model.copies).toStrictEqual(Copies.init());
      })
    );
  });
});
