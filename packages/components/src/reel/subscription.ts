import { Array, Effect, Number, Option, Queue, Schema, Stream } from "effect";
import * as Subscription from "foldkit/subscription";

import {
  escapeKeys,
  markDragging,
  pointerMessages as dragMessages,
} from "../drag/drag.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";
import { Splitter, targetAtPoint } from "./layout.ts";
import type { ColumnBox, Target } from "./layout.ts";
import { Message } from "./message.ts";
import type { PointerAt } from "./message.ts";
import type { Model } from "./model.ts";
import { By, isCarried, isIdle, scrollerOf } from "./model.ts";

const EDGE_SCROLL = 40;

const EDGE_SCROLL_PIXELS_PER_MILLI = 0.8;

const LONGEST_FRAME_MILLIS = 50;

const columnBoxOf = (element: HTMLElement): ColumnBox => {
  const rect = element.getBoundingClientRect();

  return {
    id: element.dataset["ggReelColumn"] ?? "",
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
        element.querySelectorAll<HTMLElement>("[data-gg-reel-slot]")
      ),
      (slot) => slot.dataset["ggReelSlot"] !== heldId
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
        view.querySelectorAll<HTMLElement>("[data-gg-reel-column]")
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

const gapWidthOf = (view: HTMLElement): number =>
  Option.match(Option.fromNullishOr(view.querySelector(".gg-reel-gap")), {
    onNone: () => 0,
    onSome: (gap) => gap.getBoundingClientRect().width,
  });

const columnHeightOf = (view: HTMLElement, abovePaneId: string): number =>
  Number.sumAll(
    Array.map(
      Array.fromIterable(
        view
          .querySelector(`[data-gg-reel-slot="${CSS.escape(abovePaneId)}"]`)
          ?.closest(".gg-reel-column")
          ?.querySelectorAll("[data-gg-reel-slot]") ?? []
      ),
      heightOf
    )
  );

const scaleOf = (hold: SplitterHold): number =>
  Option.match(scrollerOf(hold.reelHook), {
    onNone: () => 0,
    onSome: (view) =>
      Splitter.match(hold.splitter, {
        Width: () => view.clientWidth - gapWidthOf(view),
        Split: ({ abovePaneId }) => columnHeightOf(view, abovePaneId),
      }),
  });

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

const pointerHoldOf = (model: Model): Option.Option<PointerHold> =>
  Option.flatMap(model.maybeHeld, ({ paneId, by }) =>
    By.match(by, {
      Keyboard: () => Option.none(),
      Pointer: ({ pointerId }) =>
        Option.some({ reelHook: model.id, paneId, pointerId }),
    })
  );

const carriedHoldOf = (model: Model): Option.Option<PointerHold> =>
  Option.filter(pointerHoldOf(model), () =>
    Option.exists(model.maybeHeld, isCarried)
  );

const reelSubscriptions = Subscription.make<Model, Message>()((entry) => ({
  pointer: entry(
    { maybeHold: Schema.Option(PointerHold) },
    {
      modelToDependencies: (model) => ({
        maybeHold: pointerHoldOf(model),
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
        maybeHold: carriedHoldOf(model),
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
