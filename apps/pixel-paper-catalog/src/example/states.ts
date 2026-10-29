import {
  Button,
  EmptyState,
  FlashWord,
  Focus,
  Format,
  Loading,
  Remote,
} from "@gjermundgaraba/pixel-paper";
import { Duration, Effect, Option, Schema } from "effect";
import { AsyncData } from "foldkit";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import * as HeldWord from "../held-word.ts";
import { rowView, specView } from "../spec.ts";

const Reading = AsyncData.Schema(Schema.Finite, Schema.String);

export const Model = Schema.Struct({
  savedWord: HeldWord.Model,
  reading: Reading.schema,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSave: {},
  GotSavedWordMessage: { message: HeldWord.Message },
  ClickedRetryReading: {},
  CompletedFocus: {},
  CompletedReadSample: {},
});

export type Message = typeof Message.Type;

const SAMPLE_REQUESTS = 41_200;
const READING_ID = "sample-reading";

export const init = (): Model => ({
  savedWord: HeldWord.init(),
  reading: Reading.Stale({
    error: "The last refresh timed out (sample).",
    data: SAMPLE_REQUESTS,
  }),
});

const SAMPLE_READ = Duration.millis(900);

export const ReadSample = Command.define("ReadSample", {
  messages: [Message.CompletedReadSample],
  execute: Effect.sleep(SAMPLE_READ).pipe(
    Effect.as(Message.CompletedReadSample())
  ),
});

const savedWordFold = {
  read: (model: Model) => Option.some(model.savedWord),
  write: (model: Model, savedWord: HeldWord.Model): Model =>
    modifyFields(model, { savedWord: () => savedWord }),
  toParentMessage: (message: HeldWord.Message) =>
    Message.GotSavedWordMessage({ message }),
};

const showSavedWord = Update.foldChild({
  update: HeldWord.show,
  ...savedWordFold,
});

const foldSavedWord = Update.foldChild({
  update: HeldWord.update,
  ...savedWordFold,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => showSavedWord(model, "saved"),
    GotSavedWordMessage: ({ message: wordMessage }) =>
      foldSavedWord(model, wordMessage),
    ClickedRetryReading: () =>
      Option.match(AsyncData.revalidateOrLoad(model.reading), {
        onNone: () => ({ model }),
        onSome: (reading) => ({
          model: modifyFields(model, { reading: () => reading }),
          commands: [Focus.Focus({ id: READING_ID }), ReadSample()],
        }),
      }),
    CompletedFocus: () => ({ model }),
    CompletedReadSample: () => ({
      model: modifyFields(model, {
        reading: () => Reading.Success({ data: SAMPLE_REQUESTS }),
      }),
    }),
  });

const readingView = (
  id: string,
  reading: AsyncData.AsyncData<number, string>,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Remote.view(
    {
      id,
      data: reading,
      label: "requests",
      toErrorText: (error) => error,
      onRetry: Message.ClickedRetryReading(),
      toDataView: (requests) => [
        h.p(
          [h.Class("note-line")],
          [`${requests.toLocaleString(Format.LOCALE)} requests this month`]
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  rowView(
    [
      specView(
        "empty: what is missing, how it fills",
        [
          EmptyState.view(
            {
              title: "Nothing queued",
              headingLevel: "Strong",
              body: ["Capture a task and it waits here. (sample)"],
              actions: [
                Button.view(
                  {
                    label: "capture",
                    isSmall: true,
                    attributes: [h.Inert(true)],
                  },
                  h
                ),
              ],
            },
            h
          ),
        ],
        h
      ),
      specView(
        "loading",
        [Loading.view({ isLoading: true, label: "loading the items" }, h)],
        h
      ),
      specView(
        "data that loads: stale until retried, then refreshing and loaded",
        [
          h.div(
            [h.Class("stack gap-m")],
            readingView(READING_ID, model.reading, h)
          ),
        ],
        h
      ),
      specView(
        "data that loads: first loading, then failed",
        [
          h.div(
            [h.Class("stack gap-m"), h.Inert(true)],
            [
              ...readingView("sample-reading-loading", Reading.Loading(), h),
              ...readingView(
                "sample-reading-failed",
                Reading.Failure({
                  error: "The server did not answer (sample).",
                }),
                h
              ),
            ]
          ),
        ],
        h
      ),
      specView(
        "a flash word: press save, the word goes after a moment",
        [
          h.span(
            [h.Class("spec-inline")],
            [
              Button.view(
                {
                  label: "save",
                  isSmall: true,
                  onClick: Message.ClickedSave(),
                },
                h
              ),
              FlashWord.view(
                { maybeWord: HeldWord.maybeWord(model.savedWord) },
                h
              ),
            ]
          ),
        ],
        h
      ),
    ],
    h
  )
);
