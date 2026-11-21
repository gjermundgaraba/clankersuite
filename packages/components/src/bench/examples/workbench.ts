import {
  Bench,
  LinkState,
  LiveRegion,
  PageHead,
  Reel,
  TopBar,
  Window,
  Wordmark,
} from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Option, Record, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ layout: Reel.Layout, reel: Reel.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotReelMessage: { message: Reel.Message },
  GotTopBarMessage: { message: TopBar.Message },
});

export type Message = typeof Message.Type;

const LAYOUT: Reel.Layout = [
  {
    id: "work",
    width: 1 / 2,
    panes: [
      { id: "shell", label: "Shell", weight: 2 },
      { id: "notes", label: "Notes", weight: 1 },
    ],
  },
  {
    id: "review",
    width: 1 / 2,
    panes: [{ id: "diff", label: "Diff", weight: 1 }],
  },
];

export const init = (): Update.Return<Model, Message> => ({
  model: { layout: LAYOUT, reel: Reel.init({ id: "workbench-reel" }) },
});

const toReelMessage = (message: Reel.Message): Message =>
  Message.GotReelMessage({ message });

const reelFold = {
  read: (model: Model) => Option.some(model.reel),
  write: (model: Model, reel: Reel.Model): Model =>
    modifyFields(model, { reel: () => reel }),
  toParentMessage: toReelMessage,
};

const withLayout = (
  model: Model,
  layout: Reel.Layout
): Update.Return<Model, Message> =>
  Update.foldChildStep({
    update: (reel: Reel.Model) => Reel.reconcile(reel, { layout }),
    ...reelFold,
  })(modifyFields(model, { layout: () => layout }));

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotReelMessage: ({ message: reelMessage }) =>
      Update.foldChildStep({
        update: (reel: Reel.Model) =>
          Reel.update(reel, reelMessage, { layout: model.layout }),
        ...reelFold,
        foldOutMessage: (request: Reel.OutMessage) => (current: Model) =>
          withLayout(current, Reel.apply(current.layout, request)),
      })(model),
    GotTopBarMessage: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Reel.subscriptions("workbench"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.reel),
  toParentMessage: toReelMessage,
});

type Content = Readonly<{ glyph: GlyphName; lines: readonly string[] }>;

const CONTENT: Readonly<Record<string, Content>> = {
  shell: { glyph: "terminal", lines: ["$ vp test", "37 passed"] },
  notes: { glyph: "note", lines: ["Two pages: the goal and the budget."] },
  diff: { glyph: "diff", lines: ["- width: 1;", "+ width: 1 / 2;"] },
};

const paneView =
  (h: HtmlBuilder<Message>) =>
  (pane: Reel.Pane, render: Reel.PaneRender): Html => {
    const { glyph, lines } = Option.getOrElse(
      Record.get(CONTENT, pane.id),
      (): Content => ({ glyph: "note", lines: [] })
    );

    return Window.view(
      {
        id: render.id,
        title: pane.label,
        lead: render.lead,
        glyph,
        body: Array.map(lines, (line) => h.p([], [line])),
      },
      h
    );
  };

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      TopBar.view(
        {
          brand: [Wordmark.view({ label: "ledger" }, h)],
          tools: [LinkState.view({ state: "Online" }, h)],
          toParentMessage: (message) => Message.GotTopBarMessage({ message }),
        },
        h
      ),
      Bench.view(
        {
          head: [
            PageHead.view({ title: "Write the brief", meta: "In progress" }, h),
          ],
          body: [
            h.submodel({
              slotId: model.reel.id,
              model: model.reel,
              view: Reel.view,
              viewInputs: {
                layout: model.layout,
                label: "Workbench panes",
                toPaneView: paneView(h),
              },
              toParentMessage: toReelMessage,
            }),
          ],
        },
        h
      ),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
