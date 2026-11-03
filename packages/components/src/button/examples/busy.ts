import { Button } from "@gjermundgaraba/components";
import { Duration, Effect, Schema } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isSending: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSend: {},
  CompletedSend: {},
});

export type Message = typeof Message.Type;

export const Send = Command.define("Send", {
  messages: [Message.CompletedSend],
  execute: Effect.sleep(Duration.millis(1600)).pipe(
    Effect.as(Message.CompletedSend())
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: { isSending: false },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSend: () => ({ model: { isSending: true }, commands: [Send()] }),
    CompletedSend: () => ({ model: { isSending: false } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Button.view(
    {
      label: "send",
      variant: "Primary",
      glyph: "send",
      onClick: Message.ClickedSend(),
      isBusy: model.isSending,
    },
    h
  );
