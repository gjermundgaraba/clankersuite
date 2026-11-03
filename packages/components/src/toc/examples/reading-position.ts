import { Prose, Stack, Toc } from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Subscription } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

type Section = Toc.ViewConfig["entries"][number] &
  Readonly<{ paragraphs: readonly string[] }>;

const SECTIONS: readonly Section[] = [
  {
    id: "toc-before",
    label: "Before the window",
    level: 2,
    paragraphs: [
      "Announce the window a day ahead, in the channel the on-call engineers read, with the time it opens and the time it closes.",
      "Check that the old nodes drain before the new ones take traffic: a node that still holds connections when it stops drops them.",
      "Write down the version that runs now. It is the one a rollback goes back to.",
    ],
  },
  {
    id: "toc-during",
    label: "During",
    level: 3,
    paragraphs: [
      "Roll out in batches of four, and watch each batch for five minutes before the next one starts.",
      "A rollback is a rollout in the other direction. Rehearse it before the window, so nobody learns it during one.",
      "If a node will not drain, take it out of the pool by hand, then finish the step.",
    ],
  },
  {
    id: "toc-after",
    label: "After",
    level: 2,
    paragraphs: [
      "Watch the error rate and the latency for an hour after the last batch.",
      "Close the window in the channel where it was announced, with the version that runs now.",
      "File what went wrong, however small, while it is fresh: the next window starts from it.",
      "Delete the old nodes only after a day without a rollback.",
      "Move the dashboards that watched the old version over to the new one, and take down the ones nobody reads.",
      "Tell the teams that depend on the service which version they now call, and when the old one stops answering.",
      "Update the runbook with anything this window taught, so the next one reads it before it starts.",
    ],
  },
];

export const Model = Schema.Struct({
  maybeCurrentId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedReadingPosition: { id: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { maybeCurrentId: Option.none() },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedReadingPosition: ({ id }) => ({
      model: { maybeCurrentId: Option.some(id) },
    }),
  });

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  readingPosition: Toc.readingPositionEntry({
    headingIds: () => Array.map(SECTIONS, ({ id }) => id),
    toMessage: (id) => Message.UpdatedReadingPosition({ id }),
  }),
}));

const sectionView =
  (h: HtmlBuilder<Message>) =>
  ({ id, label, level, paragraphs }: Section): readonly Html[] => [
    level === 2 ? h.h2([h.Id(id)], [label]) : h.h3([h.Id(id)], [label]),
    ...Array.map(paragraphs, (paragraph) => h.p([], [paragraph])),
  ];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Toc.view(
          {
            entries: Array.map(SECTIONS, ({ id, label, level }) => ({
              id,
              label,
              level,
            })),
            maybeCurrentId: model.maybeCurrentId,
          },
          h
        ),
        Prose.view({ body: Array.flatMap(SECTIONS, sectionView(h)) }, h),
      ],
    },
    h
  );
