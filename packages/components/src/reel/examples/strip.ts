import {
  Button,
  Group,
  LiveRegion,
  Reel,
  Stack,
  Window,
} from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import {
  Array,
  Effect,
  Option,
  Queue,
  Record,
  Schema,
  Stream,
  String,
} from "effect";
import { Command, Mount, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ layout: Reel.Layout, reel: Reel.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotReelMessage: { message: Reel.Message },
  PressedReelKey: { action: Reel.Action },
  ClickedClose: { paneId: Schema.String },
  ClickedReset: {},
});

export type Message = typeof Message.Type;

export const LAYOUT: Reel.Layout = [
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
    width: 2 / 3,
    panes: [{ id: "diff", label: "Diff", weight: 1 }],
  },
  {
    id: "draw",
    width: 1 / 2,
    panes: [{ id: "canvas", label: "Canvas", weight: 1 }],
  },
  {
    id: "watch",
    width: 1 / 3,
    panes: [
      { id: "browser", label: "Browser", weight: 1 },
      { id: "log", label: "Log", weight: 1 },
    ],
  },
];

export const init = (): Update.Return<Model, Message> => ({
  model: { layout: LAYOUT, reel: Reel.init({ id: "workspace-reel" }) },
});

export const closed = (layout: Reel.Layout, paneId: string): Reel.Layout =>
  Array.flatMap(layout, (column) => {
    const panes = Array.filter(column.panes, (pane) => pane.id !== paneId);

    return Array.isReadonlyArrayNonEmpty(panes) ? [{ ...column, panes }] : [];
  });

const toReelMessage = (message: Reel.Message): Message =>
  Message.GotReelMessage({ message });

const withLayout = (
  model: Model,
  layout: Reel.Layout
): Update.Return<Model, Message> => {
  const reconciled = Reel.reconcile(model.reel, { layout });

  return {
    model: { layout, reel: reconciled.model },
    commands: Command.mapMessages(reconciled.commands, toReelMessage),
  };
};

const foldReel = (
  model: Model,
  step: (reel: Reel.Model) => ReturnType<typeof Reel.update>
) =>
  Update.foldChildStep({
    update: step,
    read: (current: Model) => Option.some(current.reel),
    write: (current: Model, reel: Reel.Model) =>
      modifyFields(current, { reel: () => reel }),
    toParentMessage: toReelMessage,
    foldOutMessage: (request: Reel.OutMessage) => (current: Model) =>
      withLayout(current, Reel.apply(current.layout, request)),
  })(model);

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotReelMessage: ({ message: reelMessage }) =>
      foldReel(model, (reel) =>
        Reel.update(reel, reelMessage, { layout: model.layout })
      ),
    PressedReelKey: ({ action }) =>
      foldReel(model, (reel) =>
        Reel.perform(reel, action, { layout: model.layout })
      ),
    ClickedClose: ({ paneId }) =>
      withLayout(model, closed(model.layout, paneId)),
    ClickedReset: () => withLayout(model, LAYOUT),
  });

export const subscriptions = Subscription.lift(Reel.subscriptions("workspace"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.reel),
  toParentMessage: toReelMessage,
});

type Chord = Readonly<{
  code: string;
  isShift: boolean;
  isControl: boolean;
}>;

const REEL_KEYS: ReadonlyArray<readonly [chord: string, action: Reel.Action]> =
  [
    ["H", "FocusLeft"],
    ["ArrowLeft", "FocusLeft"],
    ["J", "FocusDown"],
    ["ArrowDown", "FocusDown"],
    ["K", "FocusUp"],
    ["ArrowUp", "FocusUp"],
    ["L", "FocusRight"],
    ["ArrowRight", "FocusRight"],
    ["Shift+H", "MovePaneLeft"],
    ["Shift+J", "MovePaneDown"],
    ["Shift+K", "MovePaneUp"],
    ["Shift+L", "MovePaneRight"],
    ["Control+H", "MoveColumnLeft"],
    ["Control+L", "MoveColumnRight"],
    ["E", "PullOut"],
    ["R", "CycleWidth"],
  ];

const chordOf = (keys: string): Chord => {
  const tokens = String.split(keys, "+");
  const key = Option.getOrElse(Array.last(tokens), () => "");

  return {
    code: key.length === 1 ? `Key${key}` : key,
    isShift: Array.contains(tokens, "Shift"),
    isControl: Array.contains(tokens, "Control"),
  };
};

const isChord = (event: KeyboardEvent, chord: Chord): boolean =>
  event.metaKey &&
  event.altKey &&
  event.code === chord.code &&
  event.shiftKey === chord.isShift &&
  event.ctrlKey === chord.isControl;

const actionOf = (event: KeyboardEvent): Option.Option<Reel.Action> =>
  event.isComposing || event.repeat || event.defaultPrevented
    ? Option.none()
    : Option.map(
        Array.findFirst(REEL_KEYS, ([chord]) => isChord(event, chordOf(chord))),
        ([, action]) => action
      );

const BindReelKeys = Mount.defineStream("BindReelKeys", {
  messages: [Message.PressedReelKey],
  execute: ({ element }) =>
    Stream.callback<typeof Message.PressedReelKey.Type>((queue) => {
      const onKeyDown = (event: Event): void => {
        if (event instanceof KeyboardEvent) {
          Option.map(actionOf(event), (action) => {
            event.preventDefault();
            Queue.offerUnsafe(queue, Message.PressedReelKey({ action }));
          });
        }
      };

      return Effect.acquireRelease(
        Effect.sync(() => {
          element.addEventListener("keydown", onKeyDown);
        }),
        () =>
          Effect.sync(() => {
            element.removeEventListener("keydown", onKeyDown);
          })
      ).pipe(Effect.flatMap(() => Effect.never));
    }),
});

type Content = Readonly<{ glyph: GlyphName; lines: readonly string[] }>;

const CONTENT: Readonly<Record<string, Content>> = {
  shell: { glyph: "terminal", lines: ["$ vp test", "37 passed"] },
  notes: {
    glyph: "note",
    lines: ["Split the reel out of the board.", "Ask about the keys."],
  },
  diff: { glyph: "diff", lines: ["- width: 1;", "+ width: 2 / 3;"] },
  canvas: { glyph: "layers", lines: ["Three boxes and an arrow."] },
  browser: { glyph: "globe", lines: ["localhost:5173"] },
  log: { glyph: "script", lines: ["12:04 build ok", "12:05 deploy waiting"] },
};

const NO_CONTENT: Content = { glyph: "note", lines: [] };

const paneView =
  (h: HtmlBuilder<Message>) =>
  (pane: Reel.Pane, render: Reel.PaneRender): Html => {
    const content = Option.getOrElse(
      Record.get(CONTENT, pane.id),
      () => NO_CONTENT
    );

    return Window.view(
      {
        id: render.id,
        title: pane.label,
        lead: render.lead,
        glyph: content.glyph,
        onClose: Message.ClickedClose({ paneId: pane.id }),
        body: Array.map(content.lines, (line) => h.p([], [line])),
      },
      h
    );
  };

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        h.div(
          [h.Style({ height: "24rem" }), h.OnMount(BindReelKeys())],
          [
            h.submodel({
              slotId: model.reel.id,
              model: model.reel,
              view: Reel.view,
              viewInputs: {
                layout: model.layout,
                label: "Workspace panes",
                toPaneView: paneView(h),
              },
              toParentMessage: toReelMessage,
            }),
          ]
        ),
        Group.view(
          {
            body: [
              Button.view(
                {
                  label: "reset the layout",
                  isSmall: true,
                  onClick: Message.ClickedReset(),
                },
                h
              ),
            ],
          },
          h
        ),
        ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
      ],
    },
    h
  );
