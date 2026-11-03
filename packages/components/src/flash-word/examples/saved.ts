import { Button, FlashWord, Group } from "@gjermundgaraba/components";
import { Effect, Option, Schema } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({
  maybeSavedWord: Schema.Option(Schema.String),
  savedCount: Schema.Finite,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSave: {},
  CompletedWaitBeforeClearFlashWord: { count: Schema.Finite },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { maybeSavedWord: Option.none(), savedCount: 0 },
});

export const WaitBeforeClearFlashWord = Command.define(
  "WaitBeforeClearFlashWord",
  {
    args: { count: Schema.Finite },
    messages: [Message.CompletedWaitBeforeClearFlashWord],
    execute: ({ count }) =>
      Effect.sleep(FlashWord.HOLD).pipe(
        Effect.as(Message.CompletedWaitBeforeClearFlashWord({ count }))
      ),
  }
);

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => {
      const count = model.savedCount + 1;

      return {
        model: { maybeSavedWord: Option.some("saved"), savedCount: count },
        commands: [WaitBeforeClearFlashWord({ count })],
      };
    },
    CompletedWaitBeforeClearFlashWord: ({ count }) => ({
      model:
        count === model.savedCount
          ? { ...model, maybeSavedWord: Option.none() }
          : model,
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        Button.view(
          { label: "save", isSmall: true, onClick: Message.ClickedSave() },
          h
        ),
        FlashWord.view({ maybeWord: model.maybeSavedWord }, h),
      ],
    },
    h
  );
