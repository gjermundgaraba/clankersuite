import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Array, Effect, Option, Order, Schema, Stream, pipe } from "effect";
import type * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Attribute, HtmlBuilder } from "foldkit/html";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import { isPlain } from "../keys/keys.ts";

type Phase = "Idle" | "Pressed" | "PointerDragging" | "KeyboardDragging";

export const phaseOf = (dragAndDrop: UiDragAndDrop.Model): Phase => {
  if (Option.isNone(UiDragAndDrop.maybeDraggedItemId(dragAndDrop))) {
    return "Idle";
  } else if (!UiDragAndDrop.isDragging(dragAndDrop)) {
    return "Pressed";
  } else if (Option.isSome(UiDragAndDrop.ghostStyle(dragAndDrop))) {
    return "PointerDragging";
  }

  return "KeyboardDragging";
};

export const isCarrying = (phase: Phase): boolean =>
  phase === "PointerDragging" || phase === "KeyboardDragging";

type Holder = Readonly<{
  dragAndDrop: UiDragAndDrop.Model;
  maybeHeld: Option.Option<unknown>;
}>;

/** Whether an item is pressed or held. While it is, the arrow keys, Space and Escape belong to
 *  the list: pause the page's own bindings for them. The list takes Escape before anything
 *  else sees it. */
export const isHolding = (model: Holder): boolean =>
  phaseOf(model.dragAndDrop) !== "Idle";

export const canLift = (model: Holder): boolean => !isHolding(model);

export const settle = <Model extends Holder, Message, OutMessage>(
  step: Update.ReturnWithOutMessage<Model, Message, OutMessage>,
  maybeAnnouncement: Option.Option<Command.Command<Message>>
): Update.ReturnWithOutMessage<Model, Message, OutMessage> =>
  Update.withOutMessage(
    {
      model: isHolding(step.model)
        ? step.model
        : { ...step.model, maybeHeld: Option.none() },
      commands: [
        ...(step.commands ?? []),
        ...Array.fromOption(maybeAnnouncement),
      ],
    },
    step.outMessage
  );

export const pressedDraggable = (
  fields: Parameters<typeof UiDragAndDrop.Message.PressedDraggable>[0]
): UiDragAndDrop.Message =>
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  UiDragAndDrop.Message.PressedDraggable(fields);

export const activatedKeyboardDrag = (
  fields: Parameters<typeof UiDragAndDrop.Message.ActivatedKeyboardDrag>[0]
): UiDragAndDrop.Message =>
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  UiDragAndDrop.Message.ActivatedKeyboardDrag(fields);

export const movedPointer = (
  fields: Parameters<typeof UiDragAndDrop.Message.MovedPointer>[0]
): UiDragAndDrop.Message =>
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  UiDragAndDrop.Message.MovedPointer(fields);

export const releasedPointer = (): UiDragAndDrop.Message =>
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  UiDragAndDrop.Message.ReleasedPointer();

export const cancelledDrag = (): UiDragAndDrop.Message =>
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  UiDragAndDrop.Message.CancelledDrag();

export const LEFT_BUTTON = 0;

export const innerControls = (liftingButtons: string): string =>
  [
    "input",
    "textarea",
    "select",
    "a[href]",
    '[contenteditable]:not([contenteditable="false"])',
    `button:not(${liftingButtons})`,
    "[data-no-lift]",
  ].join(", ");

export const takeEscape = <Message>(
  event: KeyboardEvent,
  message: Message
): Option.Option<Message> => {
  if (event.key !== "Escape" || event.isComposing) {
    return Option.none();
  }

  event.preventDefault();
  event.stopPropagation();

  return Option.some(message);
};

export const escapeKeys = <Message>(message: Message): Stream.Stream<Message> =>
  Dom.streamFromEventFilterMap({
    target: () => window,
    type: "keydown",
    filterMapEvent: (event) => takeEscape(event, message),
    options: { capture: true },
  });

export const escapeSubscriptions = <Model extends Holder, Message>(
  message: Message
) =>
  Subscription.make<Model, Message>()((entry) => ({
    escape: entry(
      { isHolding: Schema.Boolean },
      {
        modelToDependencies: (model) => ({ isHolding: isHolding(model) }),
        dependenciesToStream: ({ isHolding: isHoldingNow }) =>
          isHoldingNow ? escapeKeys(message) : Stream.empty,
      }
    ),
  }));

const pressingPointer = (pointerId: number): Stream.Stream<PointerEvent> =>
  Stream.filter(
    Stream.mergeAll(
      Array.map(
        ["pointermove", "pointerup", "pointercancel"] as const,
        (type) => Stream.fromEventListener<PointerEvent>(document, type)
      ),
      { concurrency: "unbounded" }
    ),
    (event) => event.pointerId === pointerId
  );

export const pointerMessages = <Message>(
  pointerId: number,
  toMessage: Readonly<{
    moved: (event: PointerEvent) => Message;
    released: (event: PointerEvent) => Message;
    cancelled: () => Message;
  }>
): Stream.Stream<Message> =>
  Stream.map(pressingPointer(pointerId), (event) => {
    if (event.type === "pointermove") {
      return toMessage.moved(event);
    } else if (event.type === "pointerup") {
      return toMessage.released(event);
    }

    return toMessage.cancelled();
  });

export const splitterAttributes = <Message>(
  config: Readonly<{
    orientation: "vertical" | "horizontal";
    isIdle: boolean;
    onPress: (pointerId: number, clientX: number, clientY: number) => Message;
    onStep: (direction: -1 | 1) => Message;
  }>,
  h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> => {
  const [less, more] =
    config.orientation === "vertical"
      ? ["ArrowLeft", "ArrowRight"]
      : ["ArrowUp", "ArrowDown"];

  return [
    h.AriaOrientation(config.orientation),
    h.OnPointerDown(
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
          config.onPress(pointerId, clientX, clientY),
          () => button === LEFT_BUTTON && config.isIdle
        )
    ),
    h.OnKeyDownPreventDefault((key, modifiers) =>
      Option.liftPredicate(
        config.onStep(key === more ? 1 : -1),
        () => isPlain(modifiers) && (key === less || key === more)
      )
    ),
  ];
};

export const measureLift = (
  element: Element,
  sourceSelector: string,
  pressX: number,
  pressY: number
): void => {
  const maybeSource = Option.fromNullishOr(
    document.querySelector(sourceSelector)
  );

  if (Option.isSome(maybeSource) && element instanceof HTMLElement) {
    const rect = maybeSource.value.getBoundingClientRect();
    element.style.setProperty("--lift-width", `${rect.width}px`);
    element.style.setProperty("--lift-x", `${rect.left - pressX}px`);
    element.style.setProperty("--lift-y", `${rect.top - pressY}px`);
  }
};

const ROW_TOLERANCE = 1;

type Box = Readonly<{ top: number; centreX: number; centreY: number }>;

const boxOf = (element: Element): Box => {
  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    centreX: rect.left + rect.width / 2,
    centreY: rect.top + rect.height / 2,
  };
};

const isOnSameRow = (box: Box, other: Box): boolean =>
  Math.abs(other.top - box.top) < ROW_TOLERANCE;

type Axis = "Across" | "Down";

const readAxis = (boxesWithHeld: readonly Box[]): Axis =>
  Array.some(boxesWithHeld, (box, index) =>
    Option.exists(Array.get(boxesWithHeld, index + 1), (next) =>
      isOnSameRow(box, next)
    )
  )
    ? "Across"
    : "Down";

const isPastCentre = (
  axis: Axis,
  box: Box,
  clientX: number,
  clientY: number
): boolean =>
  axis === "Across" ? clientX > box.centreX : clientY > box.centreY;

export const insertionIndex = (
  container: Element,
  heldId: string,
  clientX: number,
  clientY: number
): number => {
  const items = Array.map(
    Array.fromIterable(
      container.querySelectorAll<HTMLElement>("[data-sortable-id]")
    ),
    (item) => ({ id: item.dataset["sortableId"], box: boxOf(item) })
  );

  const axis = readAxis(Array.map(items, ({ box }) => box));

  const boxes = pipe(
    Array.filter(items, (item) => item.id !== heldId),
    Array.map(({ box }) => box)
  );

  const distance = (box: Box): number =>
    Math.hypot(box.centreX - clientX, box.centreY - clientY);

  const byDistance = Order.mapInput(
    Order.Number,
    ({ box }: Readonly<{ box: Box }>) => distance(box)
  );

  return Array.match(
    Array.map(boxes, (box, index) => ({ box, index })),
    {
      onEmpty: () => 0,
      onNonEmpty: (candidates) => {
        const { box, index } = Array.min(candidates, byDistance);

        return isPastCentre(axis, box, clientX, clientY) ? index + 1 : index;
      },
    }
  );
};

const DRAGGING_ATTRIBUTE = "data-pixel-paper-dragging";

export const markDragging: Stream.Stream<never> = Stream.callback<never>(() =>
  Effect.acquireRelease(
    Effect.sync(() => {
      document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, "");
    }),
    () =>
      Effect.sync(() => {
        document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
      })
  ).pipe(Effect.flatMap(() => Effect.never))
);
