import { Button, Prose, Sheet, Toc } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import type * as Update from "foldkit/update";

import { specView } from "../spec.ts";

// SAMPLE

const ENTRIES: readonly Toc.Entry[] = [
  { id: "reading-before", label: "Before the window", level: 2 },
  { id: "reading-during", label: "During", level: 3 },
  { id: "reading-links", label: "Links", level: 2 },
];

export const Model = Schema.Struct({
  maybeCurrentId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedReadingPosition: { id: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ maybeCurrentId: Option.none() });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedReadingPosition: ({ id }) => ({
      model: modifyFields(model, { maybeCurrentId: () => Option.some(id) }),
    }),
  });

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  readingExamplePosition: Toc.readingPositionEntry({
    headingIds: () => Array.map(ENTRIES, ({ id }) => id),
    toMessage: (id) => Message.UpdatedReadingPosition({ id }),
  }),
}));

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-aside")],
    [
      specView(
        "a sheet of prose",
        [
          Sheet.view(
            {
              title: "Rollout checklist (sample)",
              byline: ["v4 · sam · 2 days ago"],
              actions: [
                Button.view(
                  { label: "edit", isSmall: true, attributes: [h.Inert(true)] },
                  h
                ),
              ],
              body: [
                Prose.view(
                  {
                    body: [
                      h.p(
                        [],
                        [
                          "Every release goes out in two steps. The chrome around this page stays on the working scale; the page itself reads at its own pace.",
                        ]
                      ),
                      h.h2([h.Id("reading-before")], ["Before the window"]),
                      h.ul(
                        [],
                        [
                          h.li([], ["Announce the window a day ahead."]),
                          h.li(
                            [],
                            [
                              "Check that ",
                              h.code([], ["before-deploy.sh"]),
                              " drains the old nodes.",
                            ]
                          ),
                        ]
                      ),
                      h.h3([h.Id("reading-during")], ["During"]),
                      h.blockquote(
                        [],
                        [
                          "A rollback is a rollout in the other direction. Rehearse it.",
                        ]
                      ),
                      h.h4([], ["If a node will not drain"]),
                      h.p(
                        [],
                        [
                          "Take it out of the pool by hand, then finish the step.",
                        ]
                      ),
                      h.h5([], ["Pods that hold a lock"]),
                      h.p(
                        [],
                        ["Wait out the lock's lease before you force them off."]
                      ),
                      h.h6([], ["Stateful sets"]),
                      h.p([], ["Drain them last, one replica at a time."]),
                      h.h2([h.Id("reading-links")], ["Links"]),
                      h.p(
                        [],
                        [
                          "Links are ink, underlined: ",
                          h.a(
                            [h.Href("#reading-before")],
                            ["back to the start"]
                          ),
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
          ),
        ],
        h
      ),
      specView(
        "its contents: the heading being read is marked",
        [
          Toc.view(
            { entries: ENTRIES, maybeCurrentId: model.maybeCurrentId },
            h
          ),
        ],
        h
      ),
    ]
  )
);
