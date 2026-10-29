import {
  Button,
  Glyph,
  KeyHelp,
  Keymap,
  Reel,
  Window,
} from "@gjermundgaraba/pixel-paper";
import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import {
  Array,
  Effect,
  Option,
  Predicate,
  Queue,
  Record,
  Schema,
  Stream,
  String,
} from "effect";
import * as Command from "foldkit/command";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { specView, wideSpecView } from "../spec.ts";

export const Model = Schema.Struct({
  layout: Reel.Layout,
  paper: Reel.Model,
  plum: Reel.Model,
  tabs: Reel.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotPaperMessage: { message: Reel.Message },
  GotPlumMessage: { message: Reel.Message },
  GotTabsMessage: { message: Reel.Message },
  PressedReelKey: { action: Reel.Action },
  ClickedClose: { paneId: Schema.String },
  ClickedReset: {},
});

export type Message = typeof Message.Type;

type Sample = Readonly<{
  glyph: "terminal" | "note" | "diff" | "layers" | "globe" | "script";
  lines: readonly string[];
}>;

const SAMPLES: Readonly<Record<string, Sample>> = {
  shell: { glyph: "terminal", lines: ["$ vp test", "37 passed"] },
  notes: {
    glyph: "note",
    lines: ["Split the reel out of the board.", "Ask about the keys."],
  },
  diff: { glyph: "diff", lines: ["- width: 1;", "+ width: 2 / 3;"] },
  canvas: { glyph: "layers", lines: ["Three boxes and an arrow."] },
  browser: { glyph: "globe", lines: ["localhost:5173, the specimen."] },
  log: { glyph: "script", lines: ["12:04 build ok", "12:05 deploy waiting"] },
};

const NO_SAMPLE: Sample = { glyph: "note", lines: [] };

export const SAMPLE_LAYOUT: Reel.Layout = [
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

export const init = (): Model => ({
  layout: SAMPLE_LAYOUT,
  paper: Reel.init({ id: "sample-reel" }),
  plum: Reel.init({ id: "sample-reel-plum" }),
  tabs: Reel.init({ id: "sample-reel-tabs" }),
});

export const closed = (layout: Reel.Layout, paneId: string): Reel.Layout =>
  Array.flatMap(layout, (column) => {
    const panes = Array.filter(column.panes, (pane) => pane.id !== paneId);

    return Array.isReadonlyArrayNonEmpty(panes) ? [{ ...column, panes }] : [];
  });

type ReelField = "paper" | "plum" | "tabs";

const toReelMessage: Readonly<
  Record<ReelField, (message: Reel.Message) => Message>
> = {
  paper: (message) => Message.GotPaperMessage({ message }),
  plum: (message) => Message.GotPlumMessage({ message }),
  tabs: (message) => Message.GotTabsMessage({ message }),
};

const withReelIn: Readonly<
  Record<ReelField, (model: Model, reel: Reel.Model) => Model>
> = {
  paper: (model, reel) => modifyFields(model, { paper: () => reel }),
  plum: (model, reel) => modifyFields(model, { plum: () => reel }),
  tabs: (model, reel) => modifyFields(model, { tabs: () => reel }),
};

const withReel = (model: Model, field: ReelField, reel: Reel.Model): Model =>
  withReelIn[field](model, reel);

const withLayout = (
  model: Model,
  layout: Reel.Layout
): Update.Return<Model, Message> => {
  const paper = Reel.reconcile(model.paper, { layout });
  const plum = Reel.reconcile(model.plum, { layout });
  const tabs = Reel.reconcile(model.tabs, { layout });

  return {
    model: { layout, paper: paper.model, plum: plum.model, tabs: tabs.model },
    commands: [
      ...Command.mapMessages(paper.commands, toReelMessage.paper),
      ...Command.mapMessages(plum.commands, toReelMessage.plum),
      ...Command.mapMessages(tabs.commands, toReelMessage.tabs),
    ],
  };
};

const foldReel = (
  model: Model,
  field: ReelField,
  step: (reel: Reel.Model) => ReturnType<typeof Reel.update>
) =>
  Update.foldChildStep({
    update: step,
    read: (current: Model) => Option.some(current[field]),
    write: (current: Model, nextReel: Reel.Model) =>
      withReel(current, field, nextReel),
    toParentMessage: toReelMessage[field],
    foldOutMessage: (request: Reel.OutMessage) => (current: Model) =>
      withLayout(current, Reel.apply(current.layout, request)),
  })(model);

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPaperMessage: ({ message: reelMessage }) =>
      foldReel(model, "paper", (reel) =>
        Reel.update(reel, reelMessage, { layout: model.layout })
      ),
    GotPlumMessage: ({ message: reelMessage }) =>
      foldReel(model, "plum", (reel) =>
        Reel.update(reel, reelMessage, { layout: model.layout })
      ),
    GotTabsMessage: ({ message: reelMessage }) =>
      foldReel(model, "tabs", (reel) =>
        Reel.update(reel, reelMessage, {
          layout: model.layout,
          arrangement: "Tabs",
        })
      ),
    PressedReelKey: ({ action }) =>
      foldReel(model, "paper", (reel) =>
        Reel.perform(reel, action, { layout: model.layout })
      ),
    ClickedClose: ({ paneId }) =>
      withLayout(model, closed(model.layout, paneId)),
    ClickedReset: () => withLayout(model, SAMPLE_LAYOUT),
  });

export const subscriptions = Subscription.aggregate(
  Subscription.lift(Reel.subscriptions("sampleReel"))<Model, Message>({
    read: (model) => Option.some(model.paper),
    toParentMessage: toReelMessage.paper,
  }),
  Subscription.lift(Reel.subscriptions("sampleReelPlum"))<Model, Message>({
    read: (model) => Option.some(model.plum),
    toParentMessage: toReelMessage.plum,
  }),
  Subscription.lift(Reel.subscriptions("sampleReelTabs"))<Model, Message>({
    read: (model) => Option.some(model.tabs),
    toParentMessage: toReelMessage.tabs,
  })
);

type ReelBinding = KeyHelp.Binding & Readonly<{ action: Reel.Action }>;

const REEL_BINDINGS: readonly ReelBinding[] = [
  {
    keys: ["Meta+Alt+H", "Meta+Alt+ArrowLeft"],
    group: "Focus",
    does: "Pane to the left",
    action: "FocusLeft",
  },
  {
    keys: ["Meta+Alt+J", "Meta+Alt+ArrowDown"],
    group: "Focus",
    does: "Pane below",
    action: "FocusDown",
  },
  {
    keys: ["Meta+Alt+K", "Meta+Alt+ArrowUp"],
    group: "Focus",
    does: "Pane above",
    action: "FocusUp",
  },
  {
    keys: ["Meta+Alt+L", "Meta+Alt+ArrowRight"],
    group: "Focus",
    does: "Pane to the right",
    action: "FocusRight",
  },
  {
    keys: ["Meta+Alt+Shift+H"],
    group: "Move",
    does: "Pane into the column to the left",
    action: "MovePaneLeft",
  },
  {
    keys: ["Meta+Alt+Shift+J"],
    group: "Move",
    does: "Pane down its column",
    action: "MovePaneDown",
  },
  {
    keys: ["Meta+Alt+Shift+K"],
    group: "Move",
    does: "Pane up its column",
    action: "MovePaneUp",
  },
  {
    keys: ["Meta+Alt+Shift+L"],
    group: "Move",
    does: "Pane into the column to the right",
    action: "MovePaneRight",
  },
  {
    keys: ["Meta+Control+Alt+H"],
    group: "Move",
    does: "Column to the left",
    action: "MoveColumnLeft",
  },
  {
    keys: ["Meta+Control+Alt+L"],
    group: "Move",
    does: "Column to the right",
    action: "MoveColumnRight",
  },
  {
    keys: ["Meta+Alt+E"],
    group: "Move",
    does: "Pane into a column of its own",
    action: "PullOut",
  },
  {
    keys: ["Meta+Alt+R"],
    group: "Size",
    does: "Next column width",
    action: "CycleWidth",
  },
];

type Chord = Readonly<{
  code: string;
  isMeta: boolean;
  isAlt: boolean;
  isShift: boolean;
  isControl: boolean;
}>;

const chordOf = (keys: string): Chord => {
  const tokens = String.split(keys, "+");
  const key = Option.getOrElse(Array.last(tokens), () => "");

  return {
    code: key.length === 1 ? `Key${String.toUpperCase(key)}` : key,
    isMeta: Array.contains(tokens, "Meta"),
    isAlt: Array.contains(tokens, "Alt"),
    isShift: Array.contains(tokens, "Shift"),
    isControl: Array.contains(tokens, "Control"),
  };
};

const isChord = (event: KeyboardEvent, chord: Chord): boolean =>
  event.code === chord.code &&
  event.metaKey === chord.isMeta &&
  event.altKey === chord.isAlt &&
  event.shiftKey === chord.isShift &&
  event.ctrlKey === chord.isControl;

const actionOf = (event: KeyboardEvent): Option.Option<Reel.Action> =>
  Option.map(
    Option.filter(
      Array.findFirst(REEL_BINDINGS, ({ keys }) =>
        Array.some(keys, (sequence) =>
          Predicate.isString(sequence)
            ? isChord(event, chordOf(sequence))
            : false
        )
      ),
      () => !event.isComposing && !event.repeat && !event.defaultPrevented
    ),
    ({ action }) => action
  );

// NOTE: Foldkit's key bindings match `KeyboardEvent.key`, and on macOS Option turns a letter
// into another character (Option and H types ˙), so the reel's chords are matched by
// `KeyboardEvent.code`, the key itself.
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

const tabLeadView =
  <ParentMessage>(h: HtmlBuilder<ParentMessage>) =>
  (pane: Reel.Pane): readonly Html[] => [
    Glyph.view(
      {
        name: Option.getOrElse(Record.get(SAMPLES, pane.id), () => NO_SAMPLE)
          .glyph,
      },
      h
    ),
  ];

export const paneView =
  <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    onClose: (paneId: string) => ParentMessage
  ) =>
  (pane: Reel.Pane, render: Reel.PaneRender): Html => {
    const sample = Option.getOrElse(
      Record.get(SAMPLES, pane.id),
      () => NO_SAMPLE
    );

    return Window.view(
      {
        id: render.id,
        title: pane.label,
        lead: render.lead,
        glyph: sample.glyph,
        onClose: onClose(pane.id),
        body: [
          ...Array.map(sample.lines, (line) =>
            h.p([h.Class("spec-reel-line")], [line])
          ),
          ...(pane.id === "shell"
            ? [
                h.input([
                  h.Class("spec-reel-input"),
                  h.Type("text"),
                  h.AriaLabel(`${pane.label} input (sample)`),
                  h.Placeholder("$"),
                  h.DataAttribute("reel-focus", ""),
                ]),
              ]
            : []),
        ],
        foot: ["sample"],
      },
      h
    );
  };

export type ViewInputs = Readonly<{ platform: KeyHint.KeyPlatform }>;

const reelFrame = (
  model: Model,
  field: ReelField,
  frameClass: string,
  label: string,
  h: HtmlBuilder<Message>,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  arrangement: Reel.Arrangement = "Strip"
): Html =>
  h.div(
    [h.Class(`spec-reel ${frameClass}`), ...attributes],
    [
      h.submodel({
        slotId: model[field].id,
        model: model[field],
        view: Reel.view,
        viewInputs: {
          layout: model.layout,
          label,
          toPaneView: paneView(h, (paneId) => Message.ClickedClose({ paneId })),
          arrangement,
          toTabLeadView: tabLeadView(h),
        },
        toParentMessage: toReelMessage[field],
      }),
    ]
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, { platform }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        wideSpecView(
          "a reel wider than its frame (sample): drag a pane by its grip into another column or a gap, or a splitter",
          [
            reelFrame(model, "paper", "spec-scheme paper", "Sample panes", h, [
              h.OnMount(BindReelKeys()),
            ]),
          ],
          h
        ),
        wideSpecView(
          "the same layout in a second client, in plum: its own focus and scroll, and down where a column is taller than its frame",
          [
            reelFrame(
              model,
              "plum",
              "short spec-scheme plum",
              "Sample panes, second client",
              h
            ),
          ],
          h
        ),
        wideSpecView(
          "the same layout as tabs in a third client: each pane at the reel's full size, one at a time, a press or the arrows on the tabs choosing it",
          [
            reelFrame(
              model,
              "tabs",
              "spec-scheme paper",
              "Sample panes, as tabs",
              h,
              [],
              "Tabs"
            ),
          ],
          h
        ),
        specView(
          "the keys the page binds for the first reel, after herdr's",
          [
            Keymap.view(
              {
                groups: KeyHelp.toKeymapGroups(REEL_BINDINGS, platform, ""),
                note: "They act while focus is in the reel, its fields too. A browser keeps some of them for itself.",
              },
              h
            ),
            Button.view(
              {
                label: "reset the layout",
                isSmall: true,
                onClick: Message.ClickedReset(),
              },
              h
            ),
          ],
          h
        ),
      ]
    )
);
