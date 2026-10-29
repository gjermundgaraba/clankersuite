import {
  Button,
  EmptyState,
  History,
  Loading,
  Panel,
  Time,
} from "@gjermundgaraba/pixel-paper";
import { Array, Number, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { SAMPLE_MOMENT } from "../sample.ts";
import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({ pageIndex: Schema.Finite });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedOlderActivity: {},
  ClickedLatestActivity: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ pageIndex: 0 });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedOlderActivity: () => ({
      model: modifyFields(model, { pageIndex: Number.increment }),
    }),
    ClickedLatestActivity: () => ({
      model: modifyFields(model, { pageIndex: () => 0 }),
    }),
  });

// SAMPLE

type Change = Readonly<{ id: string; at: number; who: string; what: string }>;

const MINUTE = 60_000;

const SAMPLE_PAGES: ReadonlyArray<readonly Change[]> = [
  [
    {
      id: "9",
      at: SAMPLE_MOMENT,
      who: "sam · client 4f2a",
      what: "Edited task #41: Book the room (title, due)",
    },
    {
      id: "8",
      at: SAMPLE_MOMENT - 7 * MINUTE,
      who: "sam · client 4f2a",
      what: "Moved task #40: Write the notes",
    },
    {
      id: "7",
      at: SAMPLE_MOMENT - 31 * MINUTE,
      who: "ops · key 91c0",
      what: "Created area #6: Later",
    },
  ],
  [
    {
      id: "6",
      at: SAMPLE_MOMENT - 2 * 60 * MINUTE,
      who: "sam · client 4f2a",
      what: "Undid change",
    },
    {
      id: "5",
      at: SAMPLE_MOMENT - 3 * 60 * MINUTE,
      who: "ops · key 91c0",
      what: "Deleted task #12: Old draft",
    },
  ],
];

type RecentChange = Readonly<{
  id: string;
  minutesAgo: number;
  who?: string;
  what: string;
}>;

const SAMPLE_RECENT: readonly RecentChange[] = [
  {
    id: "r4",
    minutesAgo: 4,
    who: "agent",
    what: "Moved the room booking under Later",
  },
  { id: "r3", minutesAgo: 12, what: "Undid change" },
  {
    id: "r2",
    minutesAgo: 38,
    who: "agent",
    what: "Renamed area #6 to Someday, maybe",
  },
  { id: "r1", minutesAgo: 95, what: "Created task #41" },
];

const recentEntry =
  (maybeNow: Option.Option<number>, h: HtmlBuilder<Message>) =>
  (change: RecentChange): History.Entry => ({
    id: change.id,
    at: [
      Time.view(
        {
          at:
            Option.getOrElse(maybeNow, () => SAMPLE_MOMENT) -
            change.minutesAgo * MINUTE,
          format: "Ago",
          maybeNow,
        },
        h
      ),
    ],
    ...(change.who === undefined ? {} : { who: [change.who] }),
    what: [change.what],
  });

const railPanelView = (
  maybeNow: Option.Option<number>,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-rail-width")],
    [
      Panel.view(
        {
          id: "sample-recent-changes",
          title: "Recent changes",
          body: [
            Loading.view({ isLoading: false, label: "loading changes" }, h),
            History.view(
              {
                entries: Array.map(SAMPLE_RECENT, recentEntry(maybeNow, h)),
                isWrapped: true,
                label: "Recent changes, newest first (sample)",
              },
              h
            ),
          ],
          foot: [
            Button.view(
              { label: "activity", isSmall: true, attributes: [h.Inert(true)] },
              h
            ),
          ],
        },
        h
      ),
    ]
  );

const toEntry =
  (maybeNow: Option.Option<number>, h: HtmlBuilder<Message>) =>
  (change: Change): History.Entry => ({
    id: change.id,
    at: [Time.view({ at: change.at, format: "DateTime", maybeNow }, h)],
    who: [change.who],
    what: [change.what],
  });

const pageView = (
  model: Model,
  maybeNow: Option.Option<number>,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  ...(model.pageIndex > 0
    ? [
        Button.view(
          {
            label: "latest activity",
            isSmall: true,
            onClick: Message.ClickedLatestActivity(),
          },
          h
        ),
      ]
    : []),
  Option.match(Array.get(SAMPLE_PAGES, model.pageIndex), {
    onNone: () =>
      EmptyState.view(
        {
          title: "No older activity",
          headingLevel: 3,
          body: ["You have reached the end of the activity history."],
        },
        h
      ),
    onSome: (changes) =>
      History.view(
        {
          entries: Array.map(changes, toEntry(maybeNow, h)),
          isWrapped: true,
          variant: "Checks",
          label: "Workspace activity, newest first (sample)",
        },
        h
      ),
  }),
  ...(model.pageIndex < SAMPLE_PAGES.length
    ? [
        Button.view(
          {
            label: "older activity",
            isSmall: true,
            onClick: Message.ClickedOlderActivity(),
          },
          h
        ),
      ]
    : []),
];

export type ViewInputs = Readonly<{ maybeNow: Option.Option<number> }>;

export const view = defineView<Model, Message, ViewInputs>(
  (model, { maybeNow }, h): Html =>
    rowView(
      [
        specView(
          "versions: the one in force inverted, a failed one red",
          [
            History.view(
              {
                label: "Versions of rollout.md (sample)",
                entries: [
                  {
                    id: "v4",
                    at: ["v4"],
                    who: ["sam"],
                    what: ["Raised the limit"],
                    isCurrent: true,
                  },
                  {
                    id: "v3",
                    at: ["v3"],
                    who: ["ops"],
                    what: ["Rollback"],
                    isFailed: true,
                    actions: [
                      Button.view(
                        {
                          label: "restore",
                          isSmall: true,
                          attributes: [h.Inert(true)],
                        },
                        h
                      ),
                    ],
                  },
                  { id: "v2", at: ["v2"], who: ["sam"], what: ["First draft"] },
                ],
              },
              h
            ),
          ],
          h
        ),
        specView(
          "activity, a page at a time: older activity loads the next",
          [h.div([h.Class("spec-stack-start")], pageView(model, maybeNow, h))],
          h
        ),
        specView(
          "in a rail's panel: compact, under its finished loading line",
          [railPanelView(maybeNow, h)],
          h
        ),
      ],
      h
    )
);
