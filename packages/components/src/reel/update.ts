import { Array, Equal, Option, String } from "effect";
import type * as Command from "foldkit/command";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";

import {
  AnnounceReel,
  FocusPane,
  FocusTab,
  RestoreFocus,
  ScrollIntoView,
} from "./command.ts";
import {
  Subject,
  WHERE_IT_WAS,
  apply,
  columnOfTarget,
  fill,
  isSplitterPresent,
  isTargetPresent,
  landingWords,
  originOf,
  placeOf,
  requestOf,
  resizeOf,
  steppedTarget,
  whereWords,
} from "./layout.ts";
import type { Layout, Place, OutMessage, Step, Target } from "./layout.ts";
import { Message } from "./message.ts";
import type { PointerAt } from "./message.ts";
import type { Arrangement, Held, Model, Resizing } from "./model.ts";
import {
  By,
  COPY,
  columnHook,
  focusedPlace,
  heldLabel,
  isCarried,
  isIdle,
  paneHook,
  tabHook,
} from "./model.ts";

/** What the reel reads from its parent as each Message arrives: the layout as the
 *  application holds it now, and how the view shows it (`Strip` when not given), which
 *  `perform` reads. */
export type UpdateContext = Readonly<{
  layout: Layout;
  arrangement?: Arrangement;
}>;

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>;

const CARRY_THRESHOLD = 5;

const withHeld = (model: Model, maybeHeld: Option.Option<Held>): Model =>
  modifyFields(model, { maybeHeld: () => maybeHeld });

const withResizing = (
  model: Model,
  maybeResizing: Option.Option<Resizing>
): Model => modifyFields(model, { maybeResizing: () => maybeResizing });

export const focusOn = (model: Model, place: Place): Model =>
  modifyFields(model, {
    maybeFocus: () =>
      Option.some({
        paneId: place.pane.id,
        column: place.columnIndex,
        row: place.row,
      }),
  });

export const announce = (text: string) => AnnounceReel({ text });

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

const previewResize = (
  model: Model,
  layout: Layout,
  share: number
): UpdateReturn =>
  Option.match(model.maybeResizing, {
    onNone: () => ({ model }),
    onSome: (resizing) => ({
      model: withResizing(
        model,
        Option.some(
          modifyFields(resizing, {
            maybeResize: () => resizeOf(layout, resizing.splitter, share),
          })
        )
      ),
    }),
  });

const commitResize = (
  model: Model,
  layout: Layout,
  share: number
): UpdateReturn =>
  Option.match(model.maybeResizing, {
    onNone: () => ({ model }),
    onSome: (resizing) =>
      Update.withOutMessage(
        { model: withResizing(model, Option.none()) },
        Option.getOrUndefined(resizeOf(layout, resizing.splitter, share))
      ),
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
) => {
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
    PressedHeldArrowKey: ({ step }) =>
      whileHeldBy(model, "Keyboard", (held) =>
        stepHeld(model, layout, held, step)
      ),
    PressedHeldDropKey: () =>
      whileHeldBy(model, "Keyboard", (held) =>
        letGo(model, layout, held, COPY.putBack)
      ),
    BlurredGrip: () =>
      whileHeldBy(model, "Keyboard", (held) => cancel(model, layout, held)),
    PressedEscape: () =>
      Option.isSome(model.maybeResizing)
        ? { model: withResizing(model, Option.none()) }
        : whileHeld(model, (held) => cancel(model, layout, held)),
    ClickedTab: ({ paneId }) =>
      selectTab(
        model,
        layout,
        paneId,
        FocusPane({ paneHook: paneHook(model, paneId) })
      ),
    PressedTabArrowKey: ({ paneId }) =>
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
    MovedSplitter: ({ share }) => previewResize(model, layout, share),
    ReleasedSplitter: ({ share }) => commitResize(model, layout, share),
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
