import {
  Array,
  Effect,
  Equal,
  Match,
  Number,
  Option,
  Order,
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
import * as Render from "foldkit/render";
import { defineTaggedUnion } from "foldkit/schema";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import type * as Update from "foldkit/update";

import * as Announcer from "../announcer/announcer.ts";
import * as Button from "../button/button.ts";
import { htmlElement } from "../dom/html-element.ts";
import {
  LEFT_BUTTON,
  escapeKeys,
  markDragging,
  measureLift,
  pointerMessages as dragMessages,
  splitterAttributes,
} from "../drag/drag.ts";
import * as Glyph from "../glyph/glyph.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { isPlain } from "../keys/keys.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";
import {
  OutMessage,
  Resize,
  Splitter,
  Step,
  Subject,
  Target,
  WHERE_IT_WAS,
  apply,
  columnOfTarget,
  fill,
  firstPlace,
  isChange,
  isSplitterPresent,
  isTargetPresent,
  landingWords,
  nextPreset,
  originOf,
  placeAt,
  placeOf,
  placeWords,
  requestOf,
  resizeOf,
  steppedTarget,
  subjectWords,
  targetAtPoint,
  whereWords,
  widthWords,
} from "./layout.ts";
import type { Column, ColumnBox, Layout, Pane, Place } from "./layout.ts";

const KEYBOARD_MOVES =
  "Arrow keys move it, space drops it, escape or tab puts it back.";

const COPY = {
  paneGrip: "Move {pane}",
  gripHelp: `Press space to pick it up. ${KEYBOARD_MOVES}`,
  widthLabel: "Width of column {column}",
  heightLabel: "Height of {pane}",
  focused: "{pane}, {where}.",
  focusedTab: "{pane}, tab {tab} of {tabs}.",
  moved: "{subject} moved to {where}.",
  widened: "Column {column} takes {width}.",
  pickedUp: "Picked up {subject}.",
  pickedUpByKeyboard: `Picked up {subject}. ${KEYBOARD_MOVES}`,
  over: "{subject}, {where}.",
  dropped: "{subject} dropped at {where}.",
  putBack: "{subject} put back where it was.",
  cancelled: "Move cancelled. {subject} put back where it was.",
  gone: "Move cancelled.",
};

const Focus = Schema.Struct({
  paneId: Schema.String,
  column: Schema.Finite,
  row: Schema.Finite,
});

const By = defineTaggedUnion({
  Pointer: {
    pointerId: Schema.Finite,
    pressX: Schema.Finite,
    pressY: Schema.Finite,
    x: Schema.Finite,
    y: Schema.Finite,
    isCarrying: Schema.Boolean,
  },
  Keyboard: {},
});

type By = typeof By.Type;

const Held = Schema.Struct({
  paneId: Schema.String,
  by: By,
  maybeTarget: Schema.Option(Target),
});

type Held = typeof Held.Type;

const Resizing = Schema.Struct({
  splitter: Splitter,
  pointerId: Schema.Finite,
  pressX: Schema.Finite,
  pressY: Schema.Finite,
  maybeResize: Schema.Option(Resize),
});

type Resizing = typeof Resizing.Type;

/** Schema for a reel: its id, the focused pane, what is held and a splitter being dragged. All
 *  of it is this client's; the layout is the application's. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeFocus: Schema.Option(Focus),
  maybeHeld: Schema.Option(Held),
  maybeResizing: Schema.Option(Resizing),
});

export type Model = typeof Model.Type;

/** How a reel shows its panes: side by side in their columns (`Strip`), or one at a time at
 *  the reel's full size under a tab per pane (`Tabs`). The application holds it and passes it
 *  in; the layout is the same in both. */
export const Arrangement = Schema.Literals(["Strip", "Tabs"]);

export type Arrangement = typeof Arrangement.Type;

const PointerAt = Schema.Struct({
  clientX: Schema.Finite,
  clientY: Schema.Finite,
  maybeTarget: Schema.Option(Target),
});

type PointerAt = typeof PointerAt.Type;

/** Union of all Messages a reel can produce. */
export const Message = defineMessageUnion({
  PressedGrip: {
    paneId: Schema.String,
    pointerId: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
  PressedGripKey: { paneId: Schema.String },
  MovedPointer: PointerAt.fields,
  ReleasedPointer: PointerAt.fields,
  CancelledPointer: {},
  SteppedHeld: { step: Step },
  DroppedHeld: {},
  LeftGrip: {},
  PressedEscape: {},
  FocusedPane: { paneId: Schema.String },
  PressedTab: { paneId: Schema.String },
  SteppedTab: { paneId: Schema.String },
  PressedSplitter: {
    splitter: Splitter,
    pointerId: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
  MovedSplitter: { share: Schema.Finite },
  ReleasedSplitter: { share: Schema.Finite },
  CancelledSplitter: {},
  PressedSplitterKey: { splitter: Splitter, share: Schema.Finite },
  CompletedAnnounceReel: {},
  CompletedFocusPane: {},
  CompletedFocusTab: {},
  CompletedRestoreFocus: {},
  CompletedScrollIntoView: {},
  CompletedSizeLiftedPane: {},
});

export type Message = typeof Message.Type;

/** Configuration for creating a reel with `init`. The `id` must be unique in the document;
 *  the reel's DOM hooks are scoped by it. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a reel focused on its first pane, holding nothing, at rest. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeFocus: Option.none(),
  maybeHeld: Option.none(),
  maybeResizing: Option.none(),
});

const focusedPlace = (model: Model, layout: Layout): Option.Option<Place> =>
  Option.orElse(
    Option.flatMap(model.maybeFocus, (focus) =>
      Option.orElse(placeOf(layout, focus.paneId), () => {
        const column = Number.clamp(focus.column, {
          minimum: 0,
          maximum: layout.length - 1,
        });

        const rows = Option.match(Array.get(layout, column), {
          onNone: () => 0,
          onSome: (found) => found.panes.length,
        });

        return placeAt(
          layout,
          column,
          Number.clamp(focus.row, { minimum: 0, maximum: rows - 1 })
        );
      })
    ),
    () => firstPlace(layout)
  );

/** The pane focus is on: the one last focused, or, when it has gone from `layout`, the pane
 *  now nearest its place; the first pane before any is focused. None for an empty layout. */
export const focusedPaneId = (
  model: Model,
  layout: Layout
): Option.Option<string> =>
  Option.map(focusedPlace(model, layout), ({ pane }) => pane.id);

const isHolding = (model: Model): boolean => Option.isSome(model.maybeHeld);

const isIdle = (model: Model): boolean =>
  !isHolding(model) && Option.isNone(model.maybeResizing);

const isCarried = (held: Held): boolean =>
  By.match(held.by, {
    Pointer: ({ isCarrying }) => isCarrying,
    Keyboard: () => true,
  });

const paneHook = (model: Model, paneId: string): string =>
  `${model.id}/pane/${paneId}`;

const columnHook = (model: Model, columnId: string): string =>
  `${model.id}/column/${columnId}`;

const tabHook = (model: Model, paneId: string): string =>
  `${model.id}/tab/${paneId}`;

const scrollerOf = (reelHook: string): Option.Option<HTMLElement> =>
  htmlElement(`[data-reel="${CSS.escape(reelHook)}"] > .reel-view`);

const paneElement = (hook: string): Option.Option<HTMLElement> =>
  htmlElement(`[data-reel-pane="${CSS.escape(hook)}"]`);

const focusInto = (pane: HTMLElement): void => {
  Option.getOrElse(htmlElement("[data-reel-focus]", pane), () => pane).focus({
    preventScroll: true,
  });
};

/** Says a focus move, a move or a step of a drag through the page's live region (as
 *  `Announcer.Announce` does). */
export const AnnounceReel = Command.define("AnnounceReel", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceReel],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(Effect.as(Message.CompletedAnnounceReel())),
});

/** Focuses the pane `paneHook` names, unless focus is already inside it: the control in it
 *  marked `data-reel-focus` (a terminal's input), or the pane itself. It does not scroll;
 *  ScrollIntoView does. */
export const FocusPane = Command.define("FocusPane", {
  args: { paneHook: Schema.String },
  messages: [Message.CompletedFocusPane],
  execute: ({ paneHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(
          Option.filter(
            paneElement(hook),
            (pane) => !pane.contains(document.activeElement)
          ),
          focusInto
        );
      });

      return Message.CompletedFocusPane();
    }),
});

/** Focuses the tab `tabHook` names, for a tab the arrows step to: the keyboard stays in the
 *  tab list until the reader goes into the pane. */
export const FocusTab = Command.define("FocusTab", {
  args: { tabHook: Schema.String },
  messages: [Message.CompletedFocusTab],
  execute: ({ tabHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(
          htmlElement(`[data-reel-tab="${CSS.escape(hook)}"]`),
          (tab) => {
            tab.focus();
          }
        );
      });

      return Message.CompletedFocusTab();
    }),
});

/** Focuses the pane `paneHook` names only where focus was lost (it left with the pane that
 *  held it), so focus the reader put somewhere else stays there. */
export const RestoreFocus = Command.define("RestoreFocus", {
  args: { paneHook: Schema.String },
  messages: [Message.CompletedRestoreFocus],
  execute: ({ paneHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        const active = document.activeElement;

        if (active === null || active === document.body) {
          Option.map(paneElement(hook), focusInto);
        }
      });

      return Message.CompletedRestoreFocus();
    }),
});

/** Scrolls the pane or column `hook` names into view, by the least distance either way, its
 *  gutter kept by the stylesheet's `scroll-margin`, once the render that placed it is in the
 *  page. It jumps: motion is stepped or instant, and a follow is instant. */
export const ScrollIntoView = Command.define("ScrollIntoView", {
  args: { hook: Schema.String },
  messages: [Message.CompletedScrollIntoView],
  execute: ({ hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        document
          .querySelector(
            `[data-reel-pane="${CSS.escape(hook)}"], [data-reel-hook="${CSS.escape(hook)}"]`
          )
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });

      return Message.CompletedScrollIntoView();
    }),
});

/** What the reel reads from its parent as each Message arrives: the layout as the
 *  application holds it now, and how the view shows it (`Strip` when not given), which
 *  `perform` reads. */
export type UpdateContext = Readonly<{
  layout: Layout;
  arrangement?: Arrangement;
}>;

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const CARRY_THRESHOLD = 5;

const withHeld = (model: Model, maybeHeld: Option.Option<Held>): Model =>
  modifyFields(model, { maybeHeld: () => maybeHeld });

const withResizing = (
  model: Model,
  maybeResizing: Option.Option<Resizing>
): Model => modifyFields(model, { maybeResizing: () => maybeResizing });

const focusOn = (model: Model, place: Place): Model =>
  modifyFields(model, {
    maybeFocus: () =>
      Option.some({
        paneId: place.pane.id,
        column: place.columnIndex,
        row: place.row,
      }),
  });

const announce = (text: string) => AnnounceReel({ text });

const heldLabel = (layout: Layout, held: Held): string =>
  Option.getOrElse(
    subjectWords(layout, Subject.Pane({ paneId: held.paneId })),
    () => ""
  );

const heldWords = (layout: Layout, held: Held): string =>
  String.capitalize(heldLabel(layout, held));

const scrollToTarget = (model: Model, layout: Layout, target: Target) =>
  Array.fromOption(
    Option.map(columnOfTarget(layout, target), (columnId) =>
      ScrollIntoView({ hook: columnHook(model, columnId) })
    )
  );

const letGo = (
  model: Model,
  layout: Layout,
  held: Held,
  putBack: string
): UpdateReturn => {
  const released = withHeld(model, Option.none());

  if (!isCarried(held)) {
    return { model: released };
  }

  const subject = heldWords(layout, held);

  const maybeRequest = Option.flatMap(held.maybeTarget, (target) =>
    requestOf(layout, held.paneId, target)
  );

  return Option.match(maybeRequest, {
    onNone: () => ({
      model: released,
      commands: [announce(fill(putBack, { subject }))],
    }),
    onSome: (request) => ({
      model: released,
      commands: [
        announce(
          fill(COPY.dropped, {
            subject,
            where: Option.getOrElse(
              whereWords(
                apply(layout, request),
                Subject.Pane({ paneId: held.paneId })
              ),
              () => WHERE_IT_WAS
            ),
          })
        ),
      ],
      outMessage: request,
    }),
  });
};

const cancel = (model: Model, layout: Layout, held: Held): UpdateReturn =>
  letGo(model, layout, { ...held, maybeTarget: Option.none() }, COPY.cancelled);

const lift = (
  model: Model,
  layout: Layout,
  paneId: string,
  by: By
): UpdateReturn =>
  Option.match(
    Option.filter(originOf(layout, paneId), () => isIdle(model)),
    {
      onNone: () => ({ model }),
      onSome: (origin) => {
        const held: Held = { paneId, by, maybeTarget: Option.some(origin) };

        return {
          model: withHeld(model, Option.some(held)),
          commands:
            by._tag === "Keyboard"
              ? [
                  announce(
                    fill(COPY.pickedUpByKeyboard, {
                      subject: heldWords(layout, held),
                    })
                  ),
                ]
              : [],
        };
      },
    }
  );

const movePointer = (
  model: Model,
  layout: Layout,
  held: Held,
  pointer: PointerAt
): UpdateReturn =>
  By.match(held.by, {
    Keyboard: () => ({ model }),
    Pointer: (by) => {
      const isCarrying =
        by.isCarrying ||
        Math.hypot(pointer.clientX - by.pressX, pointer.clientY - by.pressY) >
          CARRY_THRESHOLD;

      const next: Held = {
        ...held,
        by: By.Pointer({
          ...by,
          x: pointer.clientX,
          y: pointer.clientY,
          isCarrying,
        }),
        maybeTarget: isCarrying ? pointer.maybeTarget : held.maybeTarget,
      };

      return {
        model: withHeld(model, Option.some(next)),
        commands:
          isCarrying && !by.isCarrying
            ? [
                announce(
                  fill(COPY.pickedUp, { subject: heldWords(layout, held) })
                ),
              ]
            : [],
      };
    },
  });

const stepHeld = (
  model: Model,
  layout: Layout,
  held: Held,
  step: Step
): UpdateReturn =>
  Option.match(
    Option.filter(held.maybeTarget, () => held.by._tag === "Keyboard"),
    {
      onNone: () => ({ model }),
      onSome: (target) => {
        const next = steppedTarget(layout, held.paneId, target, step);

        if (Equal.equals(next, target)) {
          return { model };
        }

        return {
          model: withHeld(
            model,
            Option.some({ ...held, maybeTarget: Option.some(next) })
          ),
          commands: [
            announce(
              fill(COPY.over, {
                subject: heldWords(layout, held),
                where: landingWords(layout, held.paneId, next),
              })
            ),
            ...scrollToTarget(model, layout, next),
          ],
        };
      },
    }
  );

const whileHeld = (
  model: Model,
  f: (held: Held) => UpdateReturn
): UpdateReturn =>
  Option.match(model.maybeHeld, { onNone: () => ({ model }), onSome: f });

const whileHeldBy = (
  model: Model,
  by: By["_tag"],
  f: (held: Held) => UpdateReturn
): UpdateReturn =>
  whileHeld(model, (held) => (held.by._tag === by ? f(held) : { model }));

const resizeSplitter = (
  model: Model,
  layout: Layout,
  share: number,
  isLetGo: boolean
): UpdateReturn =>
  Option.match(model.maybeResizing, {
    onNone: () => ({ model }),
    onSome: (resizing) => {
      const maybeResize = resizeOf(layout, resizing.splitter, share);

      if (!isLetGo) {
        return {
          model: withResizing(model, Option.some({ ...resizing, maybeResize })),
        };
      }

      return Option.match(maybeResize, {
        onNone: () => ({ model: withResizing(model, Option.none()) }),
        onSome: (resize) => ({
          model: withResizing(model, Option.none()),
          outMessage: resize,
        }),
      });
    },
  });

const selectTab = (
  model: Model,
  layout: Layout,
  paneId: string,
  focus: Command.Command<Message>
): UpdateReturn =>
  Option.match(placeOf(layout, paneId), {
    onNone: () => ({ model }),
    onSome: (place) => ({ model: focusOn(model, place), commands: [focus] }),
  });

/** Processes a reel Message against the layout as the application holds it now, and returns
 *  the next Model, Commands and OutMessage. */
export const update = (
  model: Model,
  message: Message,
  context: UpdateContext
): UpdateReturn => {
  const { layout } = context;

  return Message.match<UpdateReturn>(message, {
    PressedGrip: ({ paneId, pointerId, clientX, clientY }) =>
      lift(
        model,
        layout,
        paneId,
        By.Pointer({
          pointerId,
          pressX: clientX,
          pressY: clientY,
          x: clientX,
          y: clientY,
          isCarrying: false,
        })
      ),
    PressedGripKey: ({ paneId }) => lift(model, layout, paneId, By.Keyboard()),
    MovedPointer: (pointer) =>
      whileHeldBy(model, "Pointer", (held) =>
        movePointer(model, layout, held, pointer)
      ),
    ReleasedPointer: (pointer) =>
      whileHeldBy(model, "Pointer", (held) =>
        letGo(
          model,
          layout,
          isCarried(held)
            ? { ...held, maybeTarget: pointer.maybeTarget }
            : held,
          COPY.putBack
        )
      ),
    CancelledPointer: () =>
      whileHeldBy(model, "Pointer", (held) =>
        letGo(
          model,
          layout,
          { ...held, maybeTarget: Option.none() },
          COPY.putBack
        )
      ),
    SteppedHeld: ({ step }) =>
      whileHeldBy(model, "Keyboard", (held) =>
        stepHeld(model, layout, held, step)
      ),
    DroppedHeld: () =>
      whileHeldBy(model, "Keyboard", (held) =>
        letGo(model, layout, held, COPY.putBack)
      ),
    LeftGrip: () =>
      whileHeldBy(model, "Keyboard", (held) => cancel(model, layout, held)),
    PressedEscape: () =>
      Option.isSome(model.maybeResizing)
        ? { model: withResizing(model, Option.none()) }
        : whileHeld(model, (held) => cancel(model, layout, held)),
    PressedTab: ({ paneId }) =>
      selectTab(
        model,
        layout,
        paneId,
        FocusPane({ paneHook: paneHook(model, paneId) })
      ),
    SteppedTab: ({ paneId }) =>
      selectTab(
        model,
        layout,
        paneId,
        FocusTab({ tabHook: tabHook(model, paneId) })
      ),
    FocusedPane: ({ paneId }) =>
      Option.match(
        Option.filter(
          placeOf(layout, paneId),
          () =>
            !Option.exists(model.maybeFocus, (focus) => focus.paneId === paneId)
        ),
        {
          onNone: () => ({ model }),
          onSome: (place) => ({ model: focusOn(model, place) }),
        }
      ),
    PressedSplitter: ({ splitter, pointerId, clientX, clientY }) =>
      !isIdle(model) || !isSplitterPresent(layout, splitter)
        ? { model }
        : {
            model: withResizing(
              model,
              Option.some({
                splitter,
                pointerId,
                pressX: clientX,
                pressY: clientY,
                maybeResize: Option.none(),
              })
            ),
          },
    MovedSplitter: ({ share }) => resizeSplitter(model, layout, share, false),
    ReleasedSplitter: ({ share }) => resizeSplitter(model, layout, share, true),
    CancelledSplitter: () => ({ model: withResizing(model, Option.none()) }),
    PressedSplitterKey: ({ splitter, share }) =>
      Option.match(resizeOf(layout, splitter, share), {
        onNone: () => ({ model }),
        onSome: (resize) => ({ model, outMessage: resize }),
      }),
    CompletedAnnounceReel: () => ({ model }),
    CompletedFocusPane: () => ({ model }),
    CompletedFocusTab: () => ({ model }),
    CompletedRestoreFocus: () => ({ model }),
    CompletedScrollIntoView: () => ({ model }),
    CompletedSizeLiftedPane: () => ({ model }),
  });
};

/**
 * Brings the reel in line with a layout that changed: call it whenever the application changes
 * the layout, by a request it applied, another client's or one of its own (a pane closed). The
 * focused pane's place is read again; when it has gone, focus moves to the pane now nearest
 * where it was, and the keyboard follows where it went with the pane. A drag whose pane has
 * gone is cancelled, and one whose target's column has gone aims where it started;
 * a splitter whose column or pane has gone lets go.
 */
export const reconcile = (
  model: Model,
  context: UpdateContext
): UpdateReturn => {
  const { layout } = context;

  const isFocusGone = Option.exists(model.maybeFocus, (focus) =>
    Option.isNone(placeOf(layout, focus.paneId))
  );

  const maybePlace = Option.filter(focusedPlace(model, layout), () =>
    Option.isSome(model.maybeFocus)
  );

  const focused = Option.match(maybePlace, {
    onNone: () => model,
    onSome: (place) => focusOn(model, place),
  });

  const restore = Array.fromOption(
    Option.map(
      Option.filter(maybePlace, () => isFocusGone),
      (place) => RestoreFocus({ paneHook: paneHook(model, place.pane.id) })
    )
  );

  const settled = Option.exists(model.maybeResizing, ({ splitter }) =>
    isSplitterPresent(layout, splitter)
  )
    ? focused
    : withResizing(focused, Option.none());

  return Option.match(settled.maybeHeld, {
    onNone: () => ({ model: settled, commands: restore }),
    onSome: (held) => {
      if (Option.isNone(placeOf(layout, held.paneId))) {
        return {
          model: withHeld(settled, Option.none()),
          commands: [...restore, announce(COPY.gone)],
        };
      }

      const maybeTarget = Option.orElse(
        Option.filter(held.maybeTarget, (target) =>
          isTargetPresent(layout, target)
        ),
        () =>
          held.by._tag === "Keyboard"
            ? originOf(layout, held.paneId)
            : Option.none()
      );

      return {
        model: withHeld(settled, Option.some({ ...held, maybeTarget })),
        commands: restore,
      };
    },
  });
};

/** What the application's keys ask of the reel. `Focus*`: focus the pane beside the focused
 *  one. `MovePane*`: move the focused pane up or down its column, or into the column beside it
 *  (past the first or last column, into a column of its own). `MoveColumn*`: move its column.
 *  `CycleWidth`: its column's width to the next preset. `PullOut`: the pane into a column of
 *  its own, right of its column. */
export const Action = Schema.Literals([
  "FocusLeft",
  "FocusRight",
  "FocusUp",
  "FocusDown",
  "MovePaneLeft",
  "MovePaneRight",
  "MovePaneUp",
  "MovePaneDown",
  "MoveColumnLeft",
  "MoveColumnRight",
  "CycleWidth",
  "PullOut",
]);

export type Action = typeof Action.Type;

const focusStep = (
  model: Model,
  layout: Layout,
  place: Place
): UpdateReturn => ({
  model: focusOn(model, place),
  commands: [
    FocusPane({ paneHook: paneHook(model, place.pane.id) }),
    ScrollIntoView({ hook: paneHook(model, place.pane.id) }),
    announce(
      fill(COPY.focused, {
        pane: place.pane.label,
        where: placeWords(layout, place),
      })
    ),
  ],
});

const requestStep = (
  model: Model,
  layout: Layout,
  place: Place,
  subject: Subject,
  maybeRequest: Option.Option<OutMessage>
): UpdateReturn =>
  Option.match(
    Option.filter(maybeRequest, (request) => isChange(layout, request)),
    {
      onNone: () => ({ model }),
      onSome: (request) => {
        const next = apply(layout, request);

        const landing = Option.getOrElse(
          placeOf(next, place.pane.id),
          () => place
        );

        const words = Option.getOrElse(
          subjectWords(layout, subject),
          () => place.pane.label
        );

        const where = Option.getOrElse(
          whereWords(next, subject),
          () => WHERE_IT_WAS
        );

        return {
          model: focusOn(model, landing),
          commands: [
            ScrollIntoView({ hook: paneHook(model, place.pane.id) }),
            announce(
              fill(COPY.moved, { subject: String.capitalize(words), where })
            ),
          ],
          outMessage: request,
        };
      },
    }
  );

const readingOrder = (layout: Layout): readonly Pane[] =>
  Array.flatMap(layout, (column) => column.panes);

const TAB_STEPS: Partial<Record.ReadonlyRecord<Action, number>> = {
  FocusLeft: -1,
  FocusUp: -1,
  FocusRight: 1,
  FocusDown: 1,
};

const performTabbed = (
  model: Model,
  action: Action,
  layout: Layout
): UpdateReturn => {
  const panes = readingOrder(layout);

  const maybeNext = Option.flatMap(
    Option.all({
      step: Option.fromUndefinedOr(TAB_STEPS[action]),
      index: Option.flatMap(focusedPaneId(model, layout), (paneId) =>
        Array.findFirstIndex(panes, (pane) => pane.id === paneId)
      ),
    }),
    ({ step, index }) =>
      Option.flatMap(Array.get(panes, index + step), (pane) =>
        Option.map(placeOf(layout, pane.id), (place) => ({
          place,
          tab: index + step + 1,
        }))
      )
  );

  return Option.match(
    Option.filter(maybeNext, () => !isHolding(model)),
    {
      onNone: () => ({ model }),
      onSome: ({ place, tab }) => ({
        model: focusOn(model, place),
        commands: [
          FocusPane({ paneHook: paneHook(model, place.pane.id) }),
          announce(
            fill(COPY.focusedTab, {
              pane: place.pane.label,
              tab,
              tabs: panes.length,
            })
          ),
        ],
      }),
    }
  );
};

const columnIdAt = (layout: Layout, index: number): Option.Option<string> =>
  Option.map(Array.get(layout, index), ({ id }) => id);

/**
 * Does what the application's key for `action` asks, from the focused pane, against the
 * layout as the application holds it: focus moves focus the pane and scroll the reel to it;
 * moves report their request as the OutMessage, which the application applies, with focus
 * kept on the pane. Each is said through the live region. Nothing happens while something is
 * held, or where there is nowhere to go. Under tabs, only the focus keys act, stepping from tab
 * to tab.
 */
export const perform = (
  model: Model,
  action: Action,
  context: UpdateContext
): UpdateReturn => {
  const { layout, arrangement = "Strip" } = context;

  if (arrangement === "Tabs") {
    return performTabbed(model, action, layout);
  }

  return Option.match(
    Option.filter(focusedPlace(model, layout), () => !isHolding(model)),
    {
      onNone: () => ({ model }),
      onSome: (place) => {
        const { column, columnIndex, row, pane } = place;
        const rows = column.panes.length;
        const paneId = pane.id;

        const ask = (
          maybeRequest: Option.Option<OutMessage>,
          subject: Subject = Subject.Pane({ paneId })
        ) => requestStep(model, layout, place, subject, maybeRequest);

        const focusAt = (toColumn: number, toRow: number): UpdateReturn =>
          Option.match(
            Option.flatMap(Array.get(layout, toColumn), (found) =>
              placeAt(
                layout,
                toColumn,
                Number.clamp(toRow, {
                  minimum: 0,
                  maximum: found.panes.length - 1,
                })
              )
            ),
            {
              onNone: () => ({ model }),
              onSome: (next) =>
                next.pane.id === paneId
                  ? { model }
                  : focusStep(model, layout, next),
            }
          );

        const sideways = (
          toColumn: number,
          edge: Option.Option<string>
        ): UpdateReturn =>
          ask(
            Option.match(Array.get(layout, toColumn), {
              onSome: (found) =>
                Option.some(
                  OutMessage.MovedPane({
                    paneId,
                    toColumnId: found.id,
                    toIndex: Math.min(row, found.panes.length),
                  })
                ),
              onNone: () =>
                Option.liftPredicate(
                  OutMessage.PulledOutPane({
                    paneId,
                    maybeBeforeColumnId: edge,
                  }),
                  () => rows > 1
                ),
            })
          );

        const moveColumn = (
          maybeBefore: Option.Option<Option.Option<string>>
        ): UpdateReturn =>
          ask(
            Option.map(maybeBefore, (maybeBeforeColumnId) =>
              OutMessage.MovedColumn({
                columnId: column.id,
                maybeBeforeColumnId,
              })
            ),
            Subject.Column({ columnId: column.id })
          );

        return Match.value(action).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.when("FocusLeft", () => focusAt(columnIndex - 1, row)),
          Match.when("FocusRight", () => focusAt(columnIndex + 1, row)),
          Match.when("FocusUp", () =>
            row > 0 ? focusAt(columnIndex, row - 1) : { model }
          ),
          Match.when("FocusDown", () => focusAt(columnIndex, row + 1)),
          Match.when("MovePaneUp", () =>
            ask(
              Option.some(
                OutMessage.MovedPane({
                  paneId,
                  toColumnId: column.id,
                  toIndex: row - 1,
                })
              )
            )
          ),
          Match.when("MovePaneDown", () =>
            ask(
              Option.some(
                OutMessage.MovedPane({
                  paneId,
                  toColumnId: column.id,
                  toIndex: row + 1,
                })
              )
            )
          ),
          Match.when("MovePaneLeft", () =>
            sideways(columnIndex - 1, columnIdAt(layout, 0))
          ),
          Match.when("MovePaneRight", () =>
            sideways(columnIndex + 1, Option.none())
          ),
          Match.when("MoveColumnLeft", () =>
            moveColumn(
              Option.map(columnIdAt(layout, columnIndex - 1), (before) =>
                Option.some(before)
              )
            )
          ),
          Match.when("MoveColumnRight", () =>
            moveColumn(
              Option.map(columnIdAt(layout, columnIndex + 1), () =>
                columnIdAt(layout, columnIndex + 2)
              )
            )
          ),
          Match.when("CycleWidth", () => {
            const width = nextPreset(column.width);

            return {
              model,
              commands: [
                ScrollIntoView({ hook: paneHook(model, paneId) }),
                announce(
                  fill(COPY.widened, {
                    column: columnIndex + 1,
                    width: widthWords(width),
                  })
                ),
              ],
              outMessage: OutMessage.ResizedColumn({
                columnId: column.id,
                width,
              }),
            };
          }),
          Match.when("PullOut", () =>
            ask(
              Option.liftPredicate(
                OutMessage.PulledOutPane({
                  paneId,
                  maybeBeforeColumnId: columnIdAt(layout, columnIndex + 1),
                }),
                () => rows > 1
              )
            )
          ),
          Match.exhaustive
        );
      },
    }
  );
};

const EDGE_SCROLL = 40;
const EDGE_SCROLL_PIXELS_PER_MILLI = 0.8;
const LONGEST_FRAME_MILLIS = 50;

const columnBoxOf = (element: HTMLElement): ColumnBox => {
  const rect = element.getBoundingClientRect();

  return {
    id: element.dataset["reelColumn"] ?? "",
    left: rect.left,
    right: rect.right,
  };
};

const slotMiddlesOf = (
  element: HTMLElement,
  heldId: string
): readonly number[] =>
  Array.map(
    Array.filter(
      Array.fromIterable(
        element.querySelectorAll<HTMLElement>("[data-reel-slot]")
      ),
      (slot) => slot.dataset["reelSlot"] !== heldId
    ),
    (slot) => {
      const slotRect = slot.getBoundingClientRect();

      return slotRect.top + slotRect.height / 2;
    }
  );

const pointerTarget = (
  reelHook: string,
  paneId: string,
  clientX: number,
  clientY: number
): Option.Option<Target> =>
  Option.map(
    Option.filter(scrollerOf(reelHook), (view) => {
      const rect = view.getBoundingClientRect();

      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    }),
    (view) => {
      const columns = Array.fromIterable(
        view.querySelectorAll<HTMLElement>("[data-reel-column]")
      );

      return targetAtPoint(
        Array.map(columns, columnBoxOf),
        clientX,
        clientY,
        (index) =>
          Option.match(Array.get(columns, index), {
            onNone: () => [],
            onSome: (column) => slotMiddlesOf(column, paneId),
          })
      );
    }
  );

const PointerHold = Schema.Struct({
  reelHook: Schema.String,
  paneId: Schema.String,
  pointerId: Schema.Finite,
});

type PointerHold = typeof PointerHold.Type;

const pointerAt = (hold: PointerHold, event: PointerEvent): PointerAt => ({
  clientX: event.clientX,
  clientY: event.clientY,
  maybeTarget: pointerTarget(
    hold.reelHook,
    hold.paneId,
    event.clientX,
    event.clientY
  ),
});

const pointerMessages = (hold: PointerHold): Stream.Stream<Message> =>
  Stream.callback<Message>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = { maybeMove: Option.none<PointerEvent>(), frame: 0 };

        const readMove = (): void => {
          cancelAnimationFrame(state.frame);
          Option.map(state.maybeMove, (event) => {
            Queue.offerUnsafe(
              queue,
              Message.MovedPointer(pointerAt(hold, event))
            );
          });
          state.maybeMove = Option.none();
        };

        const onMove = (event: PointerEvent): void => {
          if (event.pointerId === hold.pointerId) {
            if (Option.isNone(state.maybeMove)) {
              state.frame = requestAnimationFrame(readMove);
            }

            state.maybeMove = Option.some(event);
          }
        };

        const onUp = (event: PointerEvent): void => {
          if (event.pointerId === hold.pointerId) {
            readMove();
            Queue.offerUnsafe(
              queue,
              Message.ReleasedPointer(pointerAt(hold, event))
            );
          }
        };

        const onCancel = (event: PointerEvent): void => {
          if (event.pointerId === hold.pointerId) {
            cancelAnimationFrame(state.frame);
            state.maybeMove = Option.none();
            Queue.offerUnsafe(queue, Message.CancelledPointer());
          }
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onCancel);

        return { state, onMove, onUp, onCancel };
      }),
      ({ state, onMove, onUp, onCancel }) =>
        Effect.sync(() => {
          cancelAnimationFrame(state.frame);
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          document.removeEventListener("pointercancel", onCancel);
        })
    )
  );

const towards = (at: number, low: number, high: number): number => {
  if (at < low + EDGE_SCROLL) {
    return -1;
  } else if (at > high - EDGE_SCROLL) {
    return 1;
  }

  return 0;
};

const edgeScroll = (hold: PointerHold): Stream.Stream<never> =>
  Stream.callback<never>(() =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = {
          maybeAt: Option.none<Readonly<{ x: number; y: number }>>(),
          frame: 0,
          last: performance.now(),
        };

        const onMove = (event: PointerEvent): void => {
          if (event.pointerId === hold.pointerId) {
            state.maybeAt = Option.some({ x: event.clientX, y: event.clientY });
          }
        };

        const step = (now: number): void => {
          const distance =
            Math.min(now - state.last, LONGEST_FRAME_MILLIS) *
            EDGE_SCROLL_PIXELS_PER_MILLI;

          state.last = now;
          Option.map(
            Option.all({ view: scrollerOf(hold.reelHook), at: state.maybeAt }),
            ({ view, at }) => {
              const rect = view.getBoundingClientRect();
              view.scrollLeft +=
                towards(at.x, rect.left, rect.right) * distance;
              view.scrollTop += towards(at.y, rect.top, rect.bottom) * distance;
            }
          );
          state.frame = requestAnimationFrame(step);
        };

        document.addEventListener("pointermove", onMove);
        state.frame = requestAnimationFrame(step);

        return { state, onMove };
      }),
      ({ state, onMove }) =>
        Effect.sync(() => {
          cancelAnimationFrame(state.frame);
          document.removeEventListener("pointermove", onMove);
        })
    ).pipe(Effect.flatMap(() => Effect.never))
  );

const SplitterHold = Schema.Struct({
  reelHook: Schema.String,
  splitter: Splitter,
  pointerId: Schema.Finite,
  pressX: Schema.Finite,
  pressY: Schema.Finite,
});

type SplitterHold = typeof SplitterHold.Type;

const heightOf = (element: Element): number =>
  element.getBoundingClientRect().height;

const scaleOf = (hold: SplitterHold): number =>
  Option.getOrElse(
    Option.map(scrollerOf(hold.reelHook), (view) =>
      Splitter.match(hold.splitter, {
        Width: () =>
          view.clientWidth -
          Option.getOrElse(
            Option.map(
              Option.fromNullishOr(view.querySelector(".reel-gap")),
              (gap) => gap.getBoundingClientRect().width
            ),
            () => 0
          ),
        Split: ({ abovePaneId }) =>
          Number.sumAll(
            Array.map(
              Array.fromIterable(
                view
                  .querySelector(
                    `[data-reel-slot="${CSS.escape(abovePaneId)}"]`
                  )
                  ?.closest(".reel-column")
                  ?.querySelectorAll("[data-reel-slot]") ?? []
              ),
              heightOf
            )
          ),
      })
    ),
    () => 0
  );

const splitterMessages = (hold: SplitterHold): Stream.Stream<Message> =>
  Stream.suspend(() => {
    const scale = scaleOf(hold);

    const shareOf = (event: PointerEvent): number => {
      const moved =
        hold.splitter._tag === "Width"
          ? event.clientX - hold.pressX
          : event.clientY - hold.pressY;

      return scale > 0 ? moved / scale : 0;
    };

    return dragMessages<Message>(hold.pointerId, {
      moved: (event) => Message.MovedSplitter({ share: shareOf(event) }),
      released: (event) => Message.ReleasedSplitter({ share: shareOf(event) }),
      cancelled: () => Message.CancelledSplitter(),
    });
  });

const pointerHoldOf = (
  model: Model,
  isCarryingOnly: boolean
): Option.Option<PointerHold> =>
  Option.flatMap(model.maybeHeld, ({ paneId, by }) =>
    By.match(by, {
      Keyboard: () => Option.none(),
      Pointer: ({ pointerId, isCarrying }) =>
        isCarryingOnly && !isCarrying
          ? Option.none()
          : Option.some({ reelHook: model.id, paneId, pointerId }),
    })
  );

const reelSubscriptions = Subscription.make<Model, Message>()((entry) => ({
  pointer: entry(
    { maybeHold: Schema.Option(PointerHold) },
    {
      modelToDependencies: (model) => ({
        maybeHold: pointerHoldOf(model, false),
      }),
      dependenciesToStream: ({ maybeHold }) =>
        Option.match(maybeHold, {
          onNone: () => Stream.empty,
          onSome: (hold) => Stream.merge(pointerMessages(hold), markDragging),
        }),
    }
  ),
  edge: entry(
    { maybeHold: Schema.Option(PointerHold) },
    {
      modelToDependencies: (model) => ({
        maybeHold: pointerHoldOf(model, true),
      }),
      dependenciesToStream: ({ maybeHold }) =>
        Option.match(maybeHold, {
          onNone: () => Stream.empty,
          onSome: edgeScroll,
        }),
    }
  ),
  resize: entry(
    { maybeHold: Schema.Option(SplitterHold) },
    {
      modelToDependencies: (model) => ({
        maybeHold: Option.map(
          model.maybeResizing,
          ({ splitter, pointerId, pressX, pressY }) => ({
            reelHook: model.id,
            splitter,
            pointerId,
            pressX,
            pressY,
          })
        ),
      }),
      dependenciesToStream: ({ maybeHold }) =>
        Option.match(maybeHold, {
          onNone: () => Stream.empty,
          onSome: (hold) => Stream.merge(splitterMessages(hold), markDragging),
        }),
    }
  ),
  escape: entry(
    { isHolding: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        isHolding: !isIdle(model),
      }),
      dependenciesToStream: ({ isHolding: isHoldingNow }) =>
        isHoldingNow ? escapeKeys(Message.PressedEscape()) : Stream.empty,
    }
  ),
}));

/** A held pane follows the pointer (the reel scrolling near its edges), a dragged
 *  splitter resizes, and Escape puts either back, before a dialog or the page sees it, from
 *  listeners that run only while something is held. Lift them into the application's
 *  Subscriptions, once per reel, behind a key prefix of the parent's: `subscriptions("tiles")`
 *  is keyed `tilesPointer`, `tilesEdge`, `tilesResize` and `tilesEscape`. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, reelSubscriptions);

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
   *  `data-reel-focus`. */
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

const STAGE_ANCHOR = "--reel-stage";

const anchorName = (index: number): string => `--reel-${index}`;

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
          ? Option.some(Message.DroppedHeld())
          : Option.map(Record.get(HELD_STEPS, key), (step) =>
              Message.SteppedHeld({ step })
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
        h.DataAttribute("reel-grip", paneHook(model, pane.id)),
        h.AriaRoleDescription("draggable"),
        h.AriaDescribedBy(helpId(model)),
        Button.pressedAttribute(isHeld, h),
        onGripKey,
        onGripPress,
        ...(isKeyboardHeld ? [h.OnBlur(Message.LeftGrip())] : []),
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
        markClass: " drop-before",
      })),
      () =>
        Option.map(
          Option.filter(Array.last(others), () => mark.index >= others.length),
          ({ id }) => ({ paneId: id, markClass: " drop-after" })
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
      `reel-slot${Option.match(
        Option.filter(maybeDropMark, ({ paneId }) => paneId === pane.id),
        { onNone: () => "", onSome: ({ markClass }) => markClass }
      )}`
    ),
    h.DataAttribute("reel-slot", pane.id),
    h.Style({
      "--reel-weight": `${pane.weight}`,
      "--reel-anchor": anchors.get(pane.id) ?? "none",
    }),
  ]);

const splitView = (
  model: Model,
  above: Pane,
  share: number,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("div")(`split:${above.id}`, [
    h.Class("reel-split"),
    h.Role("separator"),
    h.AriaLabel(fill(COPY.heightLabel, { pane: above.label })),
    h.AriaValuemin(0),
    h.AriaValuemax(100),
    h.AriaValuenow(Math.round(share * 100)),
    h.Tabindex(0),
    h.DataAttribute("reel-split", above.id),
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
        h.Class("reel-column"),
        h.DataAttribute("reel-column", column.id),
        h.DataAttribute("reel-hook", columnHook(model, column.id)),
        h.Style({ "--reel-width": `${column.width}` }),
      ],
      stack
    ),
    h.keyed("div")(`resize:${column.id}`, [
      h.Class(
        `reel-gap reel-resize${isGapMarked(info, maybeNextId) ? " drop-here" : ""}`
      ),
      h.Role("separator"),
      h.AriaLabel(fill(COPY.widthLabel, { column: index + 1 })),
      h.AriaValuemin(0),
      h.AriaValuemax(100),
      h.AriaValuenow(Math.round(column.width * 100)),
      h.AriaValuetext(widthWords(column.width)),
      h.Tabindex(0),
      h.DataAttribute("reel-resize", column.id),
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
    [h.Class("reel-panes")],
    Array.map(panesInDomOrder, (pane) => {
      const isFocused = Option.contains(info.maybeFocusedId, pane.id);
      const isHeld = Option.contains(info.maybeCarriedId, pane.id);
      const isBehind = info.isTabbed && !isFocused;

      return h.keyed("div")(
        pane.id,
        [
          h.Class(
            `reel-pane${isFocused ? " focused" : ""}${isHeld ? " drag-dim" : ""}${isBehind ? " behind" : ""}`
          ),
          h.DataAttribute("reel-pane", paneHook(model, pane.id)),
          h.Style({ "--reel-anchor": anchors.get(pane.id) ?? "none" }),
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
                h.Class("reel-lift"),
                h.Style({ transform: `translate3d(${x}px, ${y}px, 0)` }),
                h.AriaHidden(true),
                h.Inert(true),
                h.OnMount(
                  SizeLiftedPane({
                    sourceSelector: `[data-reel-pane="${CSS.escape(paneHook(model, held.paneId))}"]`,
                    pressX,
                    pressY,
                  })
                ),
              ],
              [
                h.div(
                  [h.Class("panel window")],
                  [
                    h.div(
                      [h.Class("panel-tb")],
                      [
                        h.span(
                          [h.Class("panel-lead")],
                          [
                            h.span(
                              [h.Class("iconbtn quiet")],
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
      ({ id }) => Message.SteppedTab({ paneId: id })
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
    [h.Class("nav tabs reel-tabs"), h.Role("tablist"), h.AriaLabel(label)],
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
          h.DataAttribute("reel-tab", tabHook(model, pane.id)),
          h.OnClick(Message.PressedTab({ paneId: pane.id })),
          h.OnKeyDownPreventDefault((key, modifiers) =>
            isPlain(modifiers) ? keyOf(index, key) : Option.none()
          ),
        ],
        [
          ...toTabLeadView(pane),
          h.span([h.Class("reel-tab-words")], [pane.label]),
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
 * sideways, and down where a column is taller than the view: `div.reel` holding the scroller
 * `div.reel-view`, whose `div.reel-track` lays out the columns (`div.reel-column`, a slot per
 * pane with a splitter between) with a splitter after each, and the panes themselves in
 * `div.reel-panes`, each pinned to its slot by anchor positioning. The reel takes its height
 * from whatever holds it. The layout is the parent's; each pane renders through `toPaneView`.
 *
 * A pane's grip lifts it under a pointer or the keyboard: Space or Enter picks it up, the
 * arrows move it (left and right through the gaps and columns, up and down among a column's
 * panes), Space drops it, and Escape or Tab puts it back. A drop reports what it asks
 * of the layout as the OutMessage. Lift `subscriptions(keyPrefix)` into the application's, or
 * nothing follows the pointer, and call `reconcile` whenever the layout changes.
 *
 * Under tabs (`arrangement: "Tabs"`) the reel is `div.reel.tabbed`: a `div.nav.tabs.reel-tabs`
 * tab list over the scroller, whose track holds one `div.reel-slot.reel-stage` at the reel's
 * full size where the columns were. Every pane is pinned to it, the focused one shown and the
 * others `.behind`, hidden and inert; there are no grips and no splitters.
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
          `reel-gap${
            isGapMarked(
              info,
              Option.map(Array.head(layout), ({ id }) => id)
            )
              ? " drop-here"
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
        h.Class(isTabbed ? "reel tabbed" : "reel"),
        h.Role("group"),
        h.AriaLabel(label),
        h.DataAttribute("reel", model.id),
      ],
      [
        ...(isTabbed ? [tabListView(info, label, toTabLeadView, h)] : []),
        h.div(
          [h.Class("reel-view")],
          [
            h.div(
              [h.Class("reel-track")],
              [
                ...(isTabbed
                  ? [
                      h.div([
                        h.Class("reel-slot reel-stage"),
                        h.Style({ "--reel-anchor": STAGE_ANCHOR }),
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
