import {
  Announcer,
  Banner,
  Button,
  LiveRegion,
} from "@gjermundgaraba/components";
import { Duration, Effect, Match, Schema } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Link = Schema.Literals(["Online", "Reconnecting", "BackOnline"]);

export const Model = Schema.Struct({ link: Link });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedDropLink: {},
  ClickedRetry: {},
  CompletedAnnounce: {},
  CompletedWaitBackOnline: {},
});

export type Message = typeof Message.Type;

export const RECONNECTING =
  "Reconnecting. Your changes wait here until the link is back.";

export const BACK_ONLINE = "Back online. Your changes are saved.";

export const WaitBackOnline = Command.define("WaitBackOnline", {
  messages: [Message.CompletedWaitBackOnline],
  execute: Effect.sleep(Duration.seconds(3)).pipe(
    Effect.as(Message.CompletedWaitBackOnline())
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: { link: "Online" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDropLink: () => ({
      model: { link: "Reconnecting" },
      commands: [Announcer.Announce({ text: RECONNECTING })],
    }),
    ClickedRetry: () => ({
      model: { link: "BackOnline" },
      commands: [Announcer.Announce({ text: BACK_ONLINE }), WaitBackOnline()],
    }),
    CompletedAnnounce: () => ({ model }),
    CompletedWaitBackOnline: () => ({ model: { link: "Online" } }),
  });

const bannerView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Match.value(model.link).pipe(
    Match.withReturnType<readonly Html[]>(),
    Match.when("Online", () => []),
    Match.when("Reconnecting", () => [
      Banner.view(
        {
          tone: "Warn",
          body: [RECONNECTING],
          actions: [
            Button.view(
              {
                label: "retry",
                isSmall: true,
                onClick: Message.ClickedRetry(),
              },
              h
            ),
          ],
        },
        h
      ),
    ]),
    Match.when("BackOnline", () => [
      Banner.view({ tone: "Ok", body: [BACK_ONLINE] }, h),
    ]),
    Match.exhaustive
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Button.view(
        {
          label: "drop the link",
          onClick: Message.ClickedDropLink(),
          isDisabled: model.link !== "Online",
        },
        h
      ),
      ...bannerView(model, h),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
