import { Focus, Format, Remote, Stack } from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema } from "effect";
import { AsyncData, Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Usage = AsyncData.Schema(Schema.Finite, Schema.String);

export const Model = Schema.Struct({
  usage: Usage.schema,
  attempt: Schema.Finite,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedRetry: {},
  CompletedFocus: {},
  SucceededReadUsage: { tokens: Schema.Finite },
  FailedReadUsage: { error: Schema.String },
});

export type Message = typeof Message.Type;

const USAGE_ID = "first-load-usage";
const READ_TIME = Duration.millis(1400);

export const ReadUsage = Command.define("ReadUsage", {
  args: { attempt: Schema.Finite },
  messages: [Message.SucceededReadUsage, Message.FailedReadUsage],
  execute: ({ attempt }) =>
    Effect.sleep(READ_TIME).pipe(
      Effect.as(
        attempt === 1
          ? Message.FailedReadUsage({ error: "The server did not answer." })
          : Message.SucceededReadUsage({ tokens: 1_284_000 })
      )
    ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: { usage: Usage.Loading(), attempt: 1 },
  commands: [ReadUsage({ attempt: 1 })],
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedRetry: () =>
      Option.match(AsyncData.revalidateOrLoad(model.usage), {
        onNone: () => ({ model }),
        onSome: (usage) => {
          const attempt = model.attempt + 1;

          return {
            model: { usage, attempt },
            commands: [Focus.Focus({ id: USAGE_ID }), ReadUsage({ attempt })],
          };
        },
      }),
    CompletedFocus: () => ({ model }),
    SucceededReadUsage: ({ tokens }) => ({
      model: { ...model, usage: Usage.Success({ data: tokens }) },
    }),
    FailedReadUsage: ({ error }) => ({
      model: { ...model, usage: Usage.Failure({ error }) },
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: Remote.view(
        {
          id: USAGE_ID,
          data: model.usage,
          label: "usage",
          toErrorText: (error) => error,
          onRetry: Message.ClickedRetry(),
          toDataView: (tokens) => [
            h.p(
              [],
              [`${tokens.toLocaleString(Format.LOCALE)} tokens this month`]
            ),
          ],
        },
        h
      ),
    },
    h
  );
