import {
  Button,
  Card,
  LinkButton,
  Outcome,
  TextButton,
  Time,
  Wall,
} from "@gjermundgaraba/pixel-paper";
import { Duration, Effect, Schema } from "effect";
import type { Option } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { screenUrl } from "../route.ts";
import { brandView } from "../spec.ts";

const Shown = Schema.Literals(["Ended", "Away"]);

export const Model = Schema.Struct({ shown: Shown, isTrying: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSwitch: {},
  ClickedRetry: {},
  CompletedWaitBeforeRetry: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ shown: "Ended", isTrying: false });

const RETRY_TIME = Duration.millis(1600);

export const WaitBeforeRetry = Command.define("WaitBeforeRetry", {
  messages: [Message.CompletedWaitBeforeRetry],
  execute: Effect.sleep(RETRY_TIME).pipe(
    Effect.as(Message.CompletedWaitBeforeRetry())
  ),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSwitch: () => ({
      model: modifyFields(model, {
        shown: (shown) => (shown === "Ended" ? "Away" : "Ended"),
      }),
    }),
    ClickedRetry: () => ({
      model: modifyFields(model, { isTrying: () => true }),
      commands: [WaitBeforeRetry()],
    }),
    CompletedWaitBeforeRetry: () => ({
      model: modifyFields(model, { isTrying: () => false }),
    }),
  });

export type ViewInputs = Readonly<{ maybeNow: Option.Option<number> }>;

const TRIED_AT = Date.UTC(2026, 8, 27, 9, 41);

const switchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  TextButton.view(
    {
      label: `show: ${model.shown === "Ended" ? "service unavailable" : "session ended"}`,
      onClick: Message.ClickedSwitch(),
    },
    h
  );

const endedView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Card.view(
    {
      title: "Session",
      meta: "ended",
      isNarrow: true,
      lead: [switchView(model, h)],
      actions: [
        LinkButton.view(
          {
            label: "sign in again",
            href: screenUrl("sign-in"),
            variant: "Primary",
            isDefault: true,
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        Outcome.view(
          {
            title: "Session ended",
            body: [
              "You were signed out after twelve hours. Sign in again to carry on; the page you were on opens again after.",
            ],
          },
          h
        ),
      ],
    },
    h
  );

const awayView = (
  model: Model,
  maybeNow: Option.Option<number>,
  h: HtmlBuilder<Message>
): Html =>
  Card.view(
    {
      title: "Service",
      meta: "away",
      isNarrow: true,
      lead: [switchView(model, h)],
      actions: [
        Button.view(
          {
            label: model.isTrying ? "trying" : "try again",
            variant: "Primary",
            isDefault: true,
            isBusy: model.isTrying,
            onClick: Message.ClickedRetry(),
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        Outcome.view(
          {
            tone: "Error",
            title: "Service unavailable",
            body: [
              "The server did not answer. It may be restarting; nothing you had open was lost.",
            ],
            detail: [
              h.span(
                [h.Class("note-line")],
                [
                  "Last tried ",
                  Time.view({ at: TRIED_AT, format: "Ago", maybeNow }, h),
                  ".",
                ]
              ),
            ],
          },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, { maybeNow }, h): Html =>
    model.shown === "Ended" ? endedView(model, h) : awayView(model, maybeNow, h)
);
