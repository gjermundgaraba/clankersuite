import { Button, Notice } from "@gjermundgaraba/components";
import { Duration, Effect, Schema } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({
  connection: Schema.Literals(["Lost", "Reconnecting", "Connected"]),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedReconnect: {},
  CompletedReconnect: {},
});

export type Message = typeof Message.Type;

const RECONNECT_TIME = Duration.millis(1200);

export const init = (): Update.Return<Model, Message> => ({
  model: { connection: "Lost" },
});

export const Reconnect = Command.define("Reconnect", {
  messages: [Message.CompletedReconnect],
  execute: Effect.sleep(RECONNECT_TIME).pipe(
    Effect.as(Message.CompletedReconnect())
  ),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedReconnect: () =>
      model.connection === "Lost"
        ? { model: { connection: "Reconnecting" }, commands: [Reconnect()] }
        : { model },
    CompletedReconnect: () => ({ model: { connection: "Connected" } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.connection === "Connected"
    ? Notice.view({ tone: "Ok", body: ["Connected again."] }, h)
    : Notice.view(
        {
          title: "Offline",
          body: ["Your changes wait on this device until you reconnect."],
          actions: [
            Button.view(
              {
                label: "reconnect",
                isSmall: true,
                isBusy: model.connection === "Reconnecting",
                onClick: Message.ClickedReconnect(),
              },
              h
            ),
          ],
        },
        h
      );
