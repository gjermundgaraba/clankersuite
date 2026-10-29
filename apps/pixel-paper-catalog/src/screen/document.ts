import {
  Crumbs,
  History,
  LineDiff,
  Notice,
  PageHead,
  Panel,
  Prose,
  Tabs,
  Toc,
} from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { screenUrl } from "../route.ts";
import { PATCH, VERSIONS } from "../sample.ts";

const Tab = Schema.Literals(["Read", "History"]);

export const Model = Schema.Struct({
  tabs: Tabs.Model,
  tab: Tab,
  maybeCurrentId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
  UpdatedReadingPosition: { id: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  tabs: Tabs.init({ id: "document-tabs" }),
  tab: "Read",
  maybeCurrentId: Option.none(),
});

const foldTabs = Update.foldChild({
  update: Tabs.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model: Model, nextTabs: Tabs.Model): Model =>
    modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: (message: Tabs.Message) =>
    Message.GotTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ value }) =>
      (model) => ({
        model: modifyFields(model, {
          tab: () => Schema.decodeUnknownSync(Tab)(value),
        }),
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTabsMessage: ({ message: tabsMessage }) => foldTabs(model, tabsMessage),
    UpdatedReadingPosition: ({ id }) => ({
      model: modifyFields(model, { maybeCurrentId: () => Option.some(id) }),
    }),
  });

const ENTRIES: readonly Toc.Entry[] = [
  { id: "doc-why", label: "Why two steps", level: 2 },
  { id: "doc-before", label: "Before the window", level: 2 },
  { id: "doc-during", label: "During the window", level: 2 },
  { id: "doc-switch", label: "Switching traffic", level: 3 },
  { id: "doc-rollback", label: "Rollback", level: 2 },
];

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  documentReadingPosition: Toc.readingPositionEntry({
    headingIds: (model: Model) =>
      model.tab === "Read" ? Array.map(ENTRIES, ({ id }) => id) : [],
    toMessage: (id) => Message.UpdatedReadingPosition({ id }),
  }),
}));

const introView = (h: HtmlBuilder<Message>): readonly Html[] => [
  h.p(
    [],
    [
      "Every release goes out in two steps. The first moves a tenth of the traffic; the second moves the rest once the first has been quiet for an hour.",
    ]
  ),
  h.h2([h.Id("doc-why")], ["Why two steps"]),
  h.p(
    [],
    [
      "A fault that reaches everyone at once is an outage. The same fault reaching a tenth of the traffic is a graph that bends, and a rollback nobody else notices.",
    ]
  ),
  h.h2([h.Id("doc-before")], ["Before the window"]),
  h.ol(
    [],
    [
      h.li([], ["Announce the window a day ahead, with the notice template."]),
      h.li(
        [],
        ["Run ", h.code([], ["before-deploy.sh"]), " and read what it drains."]
      ),
      h.li([], ["Open the error-rate dashboard in a second window."]),
    ]
  ),
  Notice.view(
    {
      tone: "Quiet",
      title: "Note",
      body: [
        "The window is Tuesday at 06:00. Move it only with a day's notice.",
      ],
    },
    h
  ),
];

const windowView = (h: HtmlBuilder<Message>): readonly Html[] => [
  h.h2([h.Id("doc-during")], ["During the window"]),
  h.p(
    [],
    [
      "Keep to the order below. Each step names what to watch and for how long; none of them is a guess.",
    ]
  ),
  h.h3([h.Id("doc-switch")], ["Switching traffic"]),
  h.p(
    [],
    [
      "Switch ten percent, then wait. If the error rate stays inside its usual band for an hour, switch the rest. If it does not, see ",
      h.a([h.Href("#doc-rollback")], ["Rollback"]),
      ", or the ",
      h.a([h.Class("missing"), h.Href("#doc-rollback")], ["incident page"]),
      " nobody has written yet.",
    ]
  ),
  h.blockquote(
    [],
    ["A rollback is a rollout in the other direction. Rehearse it."]
  ),
  h.h2([h.Id("doc-rollback")], ["Rollback"]),
  h.p(
    [],
    [
      "Switch the traffic back, then leave the new nodes running so the fault can be read while it is fresh.",
    ]
  ),
];

const readView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("panel-body")],
    [Prose.view({ body: [...introView(h), ...windowView(h)] }, h)]
  );

const historyView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("panel-body")],
    [
      History.view({ entries: VERSIONS, label: "Versions" }, h),
      h.span([h.Class("label")], ["v3 against v4"]),
      LineDiff.patchView(
        { patch: PATCH, label: "Version 3 against version 4" },
        h
      ),
    ]
  );

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "document-page",
      title: "rollout.md",
      isFlush: true,
      body: [
        h.submodel({
          slotId: Tabs.id(model.tabs),
          model: model.tabs,
          view: Tabs.view,
          viewInputs: {
            label: "Page",
            tabs: [
              { value: "Read", label: "read" },
              { value: "History", label: "history", count: VERSIONS.length },
            ],
            selectedValue: model.tab,
            toPanelView: () => [
              model.tab === "Read" ? readView(h) : historyView(h),
            ],
          },
          toParentMessage: (message) => Message.GotTabsMessage({ message }),
        }),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-screen")],
    [
      Crumbs.view(
        {
          crumbs: [
            { label: "pages", href: screenUrl("document") },
            { label: "operations", href: screenUrl("document") },
            { label: "rollout checklist" },
          ],
        },
        h
      ),
      PageHead.view(
        { title: "Rollout checklist", meta: "v4 · sam · 2 days ago" },
        h
      ),
      h.div(
        [h.Class("screen-two")],
        [
          pageView(model, h),
          h.div(
            [h.Class("screen-rail")],
            [
              Panel.view(
                {
                  id: "document-contents",
                  title: "On this page",
                  isFlush: true,
                  body: [
                    Toc.view(
                      {
                        entries: ENTRIES,
                        maybeCurrentId: model.maybeCurrentId,
                      },
                      h
                    ),
                  ],
                },
                h
              ),
            ]
          ),
        ]
      ),
    ]
  )
);
