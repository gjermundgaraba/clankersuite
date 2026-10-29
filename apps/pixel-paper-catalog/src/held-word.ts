import { FlashWord } from "@gjermundgaraba/pixel-paper";
import { Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import { defineMessageUnion } from "foldkit/message";
import type * as Update from "foldkit/update";

export const Model = Schema.Struct({
  maybeWord: Schema.Option(Schema.String),
  count: Schema.Finite,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedWaitBeforeClear: { count: Schema.Finite },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ maybeWord: Option.none(), count: 0 });

export const WaitBeforeClear = Command.define("WaitBeforeClear", {
  args: { count: Schema.Finite },
  messages: [Message.CompletedWaitBeforeClear],
  execute: ({ count }) =>
    Effect.sleep(FlashWord.HOLD).pipe(
      Effect.as(Message.CompletedWaitBeforeClear({ count }))
    ),
});

export const maybeWord = (model: Model): Option.Option<string> =>
  model.maybeWord;

export const show = (
  model: Model,
  word: string
): Update.Return<Model, Message> => {
  const count = model.count + 1;

  return {
    model: { maybeWord: Option.some(word), count },
    commands: [WaitBeforeClear({ count })],
  };
};

export const update = (
  model: Model,
  message: Message
): Update.Return<Model, Message> =>
  Message.match(message, {
    CompletedWaitBeforeClear: ({ count }) => ({
      model:
        count === model.count ? { ...model, maybeWord: Option.none() } : model,
    }),
  });
