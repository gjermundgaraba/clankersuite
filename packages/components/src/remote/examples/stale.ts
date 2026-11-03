import { Focus, Format, Remote, Stack } from "@gjermundgaraba/components";
import { Duration, Effect, Option, Schema } from "effect";
import { AsyncData, Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Requests = AsyncData.Schema(Schema.Finite, Schema.String);

export const Model = Schema.Struct({ requests: Requests.schema });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedRetry: {},
  CompletedFocus: {},
  SucceededReadRequests: { requests: Schema.Finite },
});

export type Message = typeof Message.Type;

const REQUESTS_ID = "stale-requests";
const READ_TIME = Duration.millis(900);

export const init = (): Update.Return<Model, Message> => ({
  model: {
    requests: Requests.Stale({
      error: "The last refresh timed out.",
      data: 41_200,
    }),
  },
});

export const ReadRequests = Command.define("ReadRequests", {
  messages: [Message.SucceededReadRequests],
  execute: Effect.sleep(READ_TIME).pipe(
    Effect.as(Message.SucceededReadRequests({ requests: 41_350 }))
  ),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedRetry: () =>
      Option.match(AsyncData.revalidateOrLoad(model.requests), {
        onNone: () => ({ model }),
        onSome: (requests) => ({
          model: { requests },
          commands: [Focus.Focus({ id: REQUESTS_ID }), ReadRequests()],
        }),
      }),
    CompletedFocus: () => ({ model }),
    SucceededReadRequests: ({ requests }) => ({
      model: { requests: Requests.Success({ data: requests }) },
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: Remote.view(
        {
          id: REQUESTS_ID,
          data: model.requests,
          label: "requests",
          toErrorText: (error) => error,
          onRetry: Message.ClickedRetry(),
          toDataView: (requests) => [
            h.p(
              [],
              [`${requests.toLocaleString(Format.LOCALE)} requests this month`]
            ),
          ],
        },
        h
      ),
    },
    h
  );
