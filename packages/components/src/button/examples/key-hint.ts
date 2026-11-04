import { Button, KeyHint } from "@gjermundgaraba/components";
import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ platform: KeyHint.KeyPlatform });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
});

export type Message = typeof Message.Type;

export const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: { platform: "Other" },
  commands: [DetectKeyPlatform()],
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({ model: { platform } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Button.view(
    { label: "find", keyHint: { keys: "Mod+K", platform: model.platform } },
    h
  );
