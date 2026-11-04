import { Glyph } from "@gjermundgaraba/icons";
import {
  Array,
  Effect,
  Equal,
  Match,
  Number,
  Option,
  Order,
  Record,
  Schema,
} from "effect";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";
import * as Mount from "foldkit/mount";
import { defineView } from "foldkit/submodel";

import * as Button from "../button/button.ts";
import { LEFT_BUTTON, measureLift, splitterAttributes } from "../drag/drag.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { isPlain } from "../keys/keys.ts";
import { Splitter, apply, fill, requestOf, widthWords } from "./layout.ts";
import type { Column, Layout, Pane, Step, Target } from "./layout.ts";
import { Message } from "./message.ts";
import type { Arrangement, Model } from "./model.ts";
import {
  By,
  COPY,
  columnHook,
  focusedPaneId,
  heldLabel,
  isCarried,
  isIdle,
  paneHook,
  readingOrder,
  tabHook,
} from "./model.ts";

/** Sizes the copy that follows the pointer to what it lifts, and keeps the pointer where it
 *  pressed. Measures the source once, when the copy appears. */
export const SizeLiftedPane = Mount.define("SizeLiftedPane", {
  args: {
    sourceSelector: Schema.String,
    pressX: Schema.Finite,
    pressY: Schema.Finite,
  },
  messages: [Message.CompletedSizeLiftedPane],
  execute: ({ element, sourceSelector, pressX, pressY }) =>
    Effect.sync(() => {
      measureLift(element, sourceSelector, pressX, pressY);

      return Message.CompletedSizeLiftedPane();
    }),
});

/** What the reel hands `toPaneView` for each pane: put `lead` in the Window's `lead` and give
 *  it `id`. */
export type PaneRender = Readonly<{
  /** The title bar's `lead`: the pane's grip, a quiet glyph button named "Move <label>", or
   *  nothing under tabs, where a pane does not move. */
  lead: readonly Html[];
  /** The window's id, unique in the document. */
  id: string;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. `toPaneView` is a
 *  function because it may carry the parent's handlers. */
export type ViewInputs = Readonly<{
  /** The columns and their panes, as the application holds them. */
  layout: Layout;
  /** Names the reel for screen readers. */
  label: string;
  /** Renders one pane, a `Window.view` with `render.lead` as its `lead` and `render.id` as its
   *  `id`. Mark the control focus should land on in it (a terminal's input) with
   *  `data-gg-reel-focus`. */
  toPaneView: (pane: Pane, render: PaneRender) => Html;
  /** How the panes print: in their columns (`Strip`, when not given), or one at a time under
   *  their tabs (`Tabs`). Pass the same to `perform`. */
  arrangement?: Arrangement;
  /** What a pane's tab prints before its label: a kind glyph. Nothing when not given. */
  toTabLeadView?: (pane: Pane) => readonly Html[];
}>;

type ReelInfo = Readonly<{
  model: Model;
  layout: Layout;
  isTabbed: boolean;
  toPaneView: (pane: Pane, render: PaneRender) => Html;
  maybeFocusedId: Option.Option<string>;
  maybeMark: Option.Option<Target>;
  maybeCarriedId: Option.Option<string>;
}>;

const helpId = (model: Model): string => `${model.id}-grip-help`;

const SPLITTER_STEP = 0.05;

const HELD_STEPS: Record.ReadonlyRecord<string, Step> = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

const isDropKey = (key: string): boolean => key === " " || key === "Enter";

const STAGE_ANCHOR = "--gg-reel-stage";

const anchorName = (index: number): string => `--gg-reel-${index}`;

const byId = Order.mapInput(Order.String, (pane: Pane) => pane.id);

const stableDomOrder = (layout: Layout): readonly Pane[] =>
  Array.sort(
    Array.flatMap(layout, (column) => column.panes),
    byId
  );

const markOf = (model: Model, layout: Layout): Option.Option<Target> =>
  Option.flatMap(Option.filter(model.maybeHeld, isCarried), (held) =>
    Option.filter(held.maybeTarget, (target) =>
      Option.isSome(requestOf(layout, held.paneId, target))
    )
  );

const carriedIdOf = (model: Model): Option.Option<string> =>
  Option.map(Option.filter(model.maybeHeld, isCarried), ({ paneId }) => paneId);

const gripView = (model: Model, pane: Pane, h: HtmlBuilder<Message>): Html => {
  const maybeHeldHere = Option.filter(
    model.maybeHeld,
    (held) => held.paneId === pane.id
  );

  const isHeld = Option.exists(maybeHeldHere, isCarried);

  const isKeyboardHeld = Option.exists(
    maybeHeldHere,
    (held) => held.by._tag === "Keyboard"
  );

  const onGripKey: Attribute<Message> = h.OnKeyDownPreventDefault(
    (key, modifiers) => {
      if (!isPlain(modifiers)) {
        return Option.none();
      } else if (isKeyboardHeld) {
        return isDropKey(key)
          ? Option.some(Message.PressedHeldDropKey())
          : Option.map(Record.get(HELD_STEPS, key), (step) =>
              Message.PressedHeldArrowKey({ step })
            );
      }

      return Option.liftPredicate(
        Message.PressedGripKey({ paneId: pane.id }),
        () => isIdle(model) && isDropKey(key)
      );
    }
  );

  const onGripPress: Attribute<Message> = h.OnPointerDown(
    (
      _pointerType,
      button,
      _screenX,
      _screenY,
      _time,
      clientX,
      clientY,
      pointerId
    ) =>
      Option.liftPredicate(
        Message.PressedGrip({ paneId: pane.id, pointerId, clientX, clientY }),
        () => isIdle(model) && button === LEFT_BUTTON
      )
  );

  return IconButton.view(
    {
      glyph: "grip",
      label: fill(COPY.paneGrip, { pane: pane.label }),
      isQuiet: true,
      attributes: [
        h.DataAttribute("gg-reel-grip", paneHook(model, pane.id)),
        h.AriaRoleDescription("draggable"),
        h.AriaDescribedBy(helpId(model)),
        Button.pressedAttribute(isHeld, h),
        onGripKey,
        onGripPress,
        ...(isKeyboardHeld ? [h.OnBlur(Message.BlurredGrip())] : []),
      ],
    },
    h
  );
};

const reelSplitterAttributes = (
  model: Model,
  splitter: Splitter,
  h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> =>
  splitterAttributes(
    {
      orientation: splitter._tag === "Width" ? "vertical" : "horizontal",
      isIdle: isIdle(model),
      onPress: (pointerId, clientX, clientY) =>
        Message.PressedSplitter({ splitter, pointerId, clientX, clientY }),
      onStep: (direction) =>
        Message.PressedSplitterKey({
          splitter,
          share: direction * SPLITTER_STEP,
        }),
    },
    h
  );

const dropMarkOf = (
  info: ReelInfo,
  column: Column
): Option.Option<Readonly<{ paneId: string; markClass: string }>> =>
  Option.flatMap(info.maybeMark, (mark) => {
    if (mark._tag !== "Into" || mark.columnId !== column.id) {
      return Option.none();
    }

    const others = Array.filter(
      column.panes,
      (pane) => !Option.contains(info.maybeCarriedId, pane.id)
    );

    return Option.orElse(
      Option.map(Array.get(others, mark.index), ({ id }) => ({
        paneId: id,
        markClass: " gg-drop-before",
      })),
      () =>
        Option.map(
          Option.filter(Array.last(others), () => mark.index >= others.length),
          ({ id }) => ({ paneId: id, markClass: " gg-drop-after" })
        )
    );
  });

const isGapMarked = (
  info: ReelInfo,
  maybeBeforeColumnId: Option.Option<string>
): boolean =>
  Option.exists(
    info.maybeMark,
    (mark) =>
      mark._tag === "Gap" &&
      Equal.equals(mark.maybeBeforeColumnId, maybeBeforeColumnId)
  );

const slotView = (
  anchors: ReadonlyMap<string, string>,
  maybeDropMark: Option.Option<Readonly<{ paneId: string; markClass: string }>>,
  pane: Pane,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("div")(pane.id, [
    h.Class(
      `gg-reel-slot${Option.match(
        Option.filter(maybeDropMark, ({ paneId }) => paneId === pane.id),
        { onNone: () => "", onSome: ({ markClass }) => markClass }
      )}`
    ),
    h.DataAttribute("gg-reel-slot", pane.id),
    h.Style({
      "--gg-reel-weight": `${pane.weight}`,
      "--gg-reel-anchor": anchors.get(pane.id) ?? "none",
    }),
  ]);

const splitView = (
  model: Model,
  above: Pane,
  share: number,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("div")(`split:${above.id}`, [
    h.Class("gg-reel-split"),
    h.Role("separator"),
    h.AriaLabel(fill(COPY.heightLabel, { pane: above.label })),
    h.AriaValuemin(0),
    h.AriaValuemax(100),
    h.AriaValuenow(Math.round(share * 100)),
    h.Tabindex(0),
    h.DataAttribute("gg-reel-split", above.id),
    ...reelSplitterAttributes(
      model,
      Splitter.Split({ abovePaneId: above.id }),
      h
    ),
  ]);

const columnView = (
  info: ReelInfo,
  anchors: ReadonlyMap<string, string>,
  column: Column,
  index: number,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model, layout } = info;
  const total = Number.sumAll(Array.map(column.panes, (pane) => pane.weight));
  const maybeDropMark = dropMarkOf(info, column);

  const stack = Array.flatMap(column.panes, (pane, row) => [
    ...Array.fromOption(
      Option.map(Array.get(column.panes, row - 1), (above) =>
        splitView(model, above, total > 0 ? above.weight / total : 0, h)
      )
    ),
    slotView(anchors, maybeDropMark, pane, h),
  ]);

  const maybeNextId = Option.map(Array.get(layout, index + 1), ({ id }) => id);

  return [
    h.keyed("div")(
      `column:${column.id}`,
      [
        h.Class("gg-reel-column"),
        h.DataAttribute("gg-reel-column", column.id),
        h.DataAttribute("gg-reel-hook", columnHook(model, column.id)),
        h.Style({ "--gg-reel-width": `${column.width}` }),
      ],
      stack
    ),
    h.keyed("div")(`resize:${column.id}`, [
      h.Class(
        `gg-reel-gap gg-reel-resize${isGapMarked(info, maybeNextId) ? " gg-drop-here" : ""}`
      ),
      h.Role("separator"),
      h.AriaLabel(fill(COPY.widthLabel, { column: index + 1 })),
      h.AriaValuemin(0),
      h.AriaValuemax(100),
      h.AriaValuenow(Math.round(column.width * 100)),
      h.AriaValuetext(widthWords(column.width)),
      h.Tabindex(0),
      h.DataAttribute("gg-reel-resize", column.id),
      ...reelSplitterAttributes(
        model,
        Splitter.Width({ columnId: column.id }),
        h
      ),
    ]),
  ];
};

const paneLayerView = (
  info: ReelInfo,
  panesInDomOrder: readonly Pane[],
  anchors: ReadonlyMap<string, string>,
  h: HtmlBuilder<Message>
): Html => {
  const { model } = info;

  return h.div(
    [h.Class("gg-reel-panes")],
    Array.map(panesInDomOrder, (pane) => {
      const isFocused = Option.contains(info.maybeFocusedId, pane.id);
      const isHeld = Option.contains(info.maybeCarriedId, pane.id);
      const isBehind = info.isTabbed && !isFocused;

      return h.keyed("div")(
        pane.id,
        [
          h.Class(
            `gg-reel-pane${isFocused ? " gg-focused" : ""}${isHeld ? " gg-drag-dim" : ""}${isBehind ? " gg-behind" : ""}`
          ),
          h.DataAttribute("gg-reel-pane", paneHook(model, pane.id)),
          h.Style({ "--gg-reel-anchor": anchors.get(pane.id) ?? "none" }),
          h.Tabindex(-1),
          ...(isBehind ? [h.Inert(true)] : []),
          h.OnFocusEnter(Message.FocusedPane({ paneId: pane.id })),
        ],
        [
          info.toPaneView(pane, {
            lead: info.isTabbed ? [] : [gripView(model, pane, h)],
            id: `${model.id}-${pane.id}`,
          }),
        ]
      );
    })
  );
};

const liftedCopyView = (
  info: ReelInfo,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model, layout } = info;

  return Array.fromOption(
    Option.flatMap(model.maybeHeld, (held) =>
      By.match(held.by, {
        Keyboard: () => Option.none(),
        Pointer: ({ isCarrying, pressX, pressY, x, y }) =>
          Option.liftPredicate(
            h.div(
              [
                h.Class("gg-reel-lift"),
                h.Style({ transform: `translate3d(${x}px, ${y}px, 0)` }),
                h.AriaHidden(true),
                h.Inert(true),
                h.OnMount(
                  SizeLiftedPane({
                    sourceSelector: `[data-gg-reel-pane="${CSS.escape(paneHook(model, held.paneId))}"]`,
                    pressX,
                    pressY,
                  })
                ),
              ],
              [
                h.div(
                  [h.Class("gg-panel gg-window")],
                  [
                    h.div(
                      [h.Class("gg-panel-tb")],
                      [
                        h.span(
                          [h.Class("gg-panel-lead")],
                          [
                            h.span(
                              [h.Class("gg-iconbtn gg-quiet")],
                              [Glyph.view({ name: "grip" }, h)]
                            ),
                          ]
                        ),
                        h.h2([], [heldLabel(layout, held)]),
                      ]
                    ),
                  ]
                ),
              ]
            ),
            () => isCarrying
          ),
      })
    )
  );
};

const tabListView = (
  info: ReelInfo,
  label: string,
  toTabLeadView: (pane: Pane) => readonly Html[],
  h: HtmlBuilder<Message>
): Html => {
  const { model, layout } = info;
  const panes = readingOrder(layout);

  const stepTo = (index: number): Option.Option<Message> =>
    Option.map(
      Array.get(panes, (index + panes.length) % panes.length),
      ({ id }) => Message.PressedTabArrowKey({ paneId: id })
    );

  const keyOf = (index: number, key: string): Option.Option<Message> =>
    Match.value(key).pipe(
      Match.when("ArrowLeft", () => stepTo(index - 1)),
      Match.when("ArrowRight", () => stepTo(index + 1)),
      Match.when("Home", () => stepTo(0)),
      Match.when("End", () => stepTo(panes.length - 1)),
      Match.orElse(() => Option.none())
    );

  return h.div(
    [
      h.Class("gg-nav gg-tabs gg-reel-tabs"),
      h.Role("tablist"),
      h.AriaLabel(label),
    ],
    Array.map(panes, (pane, index) => {
      const isSelected = Option.contains(info.maybeFocusedId, pane.id);

      return h.keyed("button")(
        pane.id,
        [
          h.Type("button"),
          h.Role("tab"),
          h.AriaSelected(isSelected),
          h.AriaControls(`${model.id}-${pane.id}`),
          h.Tabindex(isSelected ? 0 : -1),
          h.DataAttribute("gg-reel-tab", tabHook(model, pane.id)),
          h.OnClick(Message.ClickedTab({ paneId: pane.id })),
          h.OnKeyDownPreventDefault((key, modifiers) =>
            isPlain(modifiers) ? keyOf(index, key) : Option.none()
          ),
        ],
        [
          ...toTabLeadView(pane),
          h.span([h.Class("gg-reel-tab-words")], [pane.label]),
        ]
      );
    })
  );
};

const NO_TAB_LEAD = (): readonly Html[] => [];

const previewed = (model: Model, layout: Layout): Layout =>
  Option.match(
    Option.flatMap(model.maybeResizing, ({ maybeResize }) => maybeResize),
    { onNone: () => layout, onSome: (resize) => apply(layout, resize) }
  );

/**
 * A row of columns wider than the view when it must be, each a stack of panes, scrolled
 * sideways, and down where a column is taller than the view. The scroller's track lays out the columns (a
 * slot per pane with a splitter between) with a splitter after each, and each pane is pinned
 * to its slot by anchor positioning. The reel takes its height
 * from whatever holds it. The layout is the parent's; each pane renders through `toPaneView`.
 *
 * A pane's grip lifts it under a pointer or the keyboard: Space or Enter picks it up, the
 * arrows move it (left and right through the gaps and columns, up and down among a column's
 * panes), Space drops it, and Escape or Tab puts it back. A drop reports what it asks
 * of the layout as the OutMessage. Lift `subscriptions(keyPrefix)` into the application's, or
 * nothing follows the pointer, and call `reconcile` whenever the layout changes.
 *
 * Under tabs (`arrangement: "Tabs"`) the reel is a tab list over the scroller, whose track
 * holds one slot at the reel's full size where the columns were. Every pane is pinned to it,
 * the focused one shown and the others hidden and inert; there are no grips and no splitters.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      label,
      toPaneView,
      arrangement = "Strip",
      toTabLeadView = NO_TAB_LEAD,
    } = viewInputs;

    const isTabbed = arrangement === "Tabs";
    const layout = previewed(model, viewInputs.layout);

    const panesInDomOrder = stableDomOrder(layout);

    const anchors = new Map(
      Array.map(
        panesInDomOrder,
        (pane, index) =>
          [pane.id, isTabbed ? STAGE_ANCHOR : anchorName(index)] as const
      )
    );

    const info: ReelInfo = {
      model,
      layout,
      isTabbed,
      toPaneView,
      maybeFocusedId: focusedPaneId(model, layout),
      maybeMark: markOf(model, layout),
      maybeCarriedId: carriedIdOf(model),
    };

    const strip = (): readonly Html[] => [
      h.keyed("div")("gap:start", [
        h.Class(
          `gg-reel-gap${
            isGapMarked(
              info,
              Option.map(Array.head(layout), ({ id }) => id)
            )
              ? " gg-drop-here"
              : ""
          }`
        ),
      ]),
      ...Array.flatMap(layout, (column, index) =>
        columnView(info, anchors, column, index, h)
      ),
    ];

    return h.div(
      [
        h.Class(isTabbed ? "gg-reel gg-tabbed" : "gg-reel"),
        h.Role("group"),
        h.AriaLabel(label),
        h.DataAttribute("gg-reel", model.id),
      ],
      [
        ...(isTabbed ? [tabListView(info, label, toTabLeadView, h)] : []),
        h.div(
          [h.Class("gg-reel-view")],
          [
            h.div(
              [h.Class("gg-reel-track")],
              [
                ...(isTabbed
                  ? [
                      h.div([
                        h.Class("gg-reel-slot gg-reel-stage"),
                        h.Style({ "--gg-reel-anchor": STAGE_ANCHOR }),
                      ]),
                    ]
                  : strip()),
                paneLayerView(info, panesInDomOrder, anchors, h),
              ]
            ),
          ]
        ),
        h.p([h.Id(helpId(model)), h.Class("sr-only")], [COPY.gripHelp]),
        ...liftedCopyView(info, h),
      ]
    );
  }
);
