import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Array, Effect, Match, Option, Schema, Stream, pipe } from "effect";
import * as Command from "foldkit/command";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import * as Announcer from "../announcer/announcer.ts";
import * as Button from "../button/button.ts";
import {
  LEFT_BUTTON,
  activatedKeyboardDrag,
  canLift,
  cancelledDrag,
  escapeSubscriptions,
  insertionIndex,
  isCarrying,
  markDragging,
  measureLift,
  movedPointer,
  phaseOf,
  pointerMessages as dragMessages,
  pressedDraggable,
  releasedPointer,
  settle as settleDrag,
} from "../drag/drag.ts";
import * as Glyph from "../glyph/glyph.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { LOCALE } from "../locale/locale.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";

/** Schema for one item as the list knows it: its id, unique in the list, and its name in
 *  words, which the grip and screen readers use. */
export const Item = Schema.Struct({ id: Schema.String, label: Schema.String });

export type Item = typeof Item.Type;

const KEYBOARD_MOVES =
  "Arrow keys move it one place, space drops it, escape cancels.";

const COPY = {
  gripLabel: "Move {item}",
  gripHelp: `Press space to pick the item up. ${KEYBOARD_MOVES}`,
  pickedUp: "Picked up {item}.",
  pickedUpByKeyboard: `Picked up {item}, {position} of {total}. ${KEYBOARD_MOVES}`,
  over: "{item}, {position} of {total}.",
  dropped: "{item} dropped at {position} of {total}.",
  putBack: "{item} put back where it was.",
  cancelled: "Move cancelled. {item} put back where it was.",
};

const Press = Schema.Struct({
  pointerId: Schema.Finite,
  clientX: Schema.Finite,
  clientY: Schema.Finite,
});

const Held = Schema.Struct({
  item: Item,
  items: Schema.Array(Item),
  maybePress: Schema.Option(Press),
});

type Held = typeof Held.Type;

/** Schema for a sortable: the `@foldkit/ui` DragAndDrop it moves items with, and what it keeps
 *  while an item is held. The items are the parent's. */
export const Model = Schema.Struct({
  dragAndDrop: UiDragAndDrop.Model,
  maybeHeld: Schema.Option(Held),
});

export type Model = typeof Model.Type;

/** Union of all Messages a sortable can produce. */
export const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: UiDragAndDrop.Message },
  PressedItem: {
    itemId: Schema.String,
    pointerId: Schema.Finite,
    screenX: Schema.Finite,
    screenY: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    items: Schema.Array(Item),
  },
  PressedGripKey: { itemId: Schema.String, items: Schema.Array(Item) },
  MovedPointer: {
    screenX: Schema.Finite,
    screenY: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    maybeIndex: Schema.Option(Schema.Finite),
  },
  ReleasedPointer: {
    screenX: Schema.Finite,
    screenY: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    maybeIndex: Schema.Option(Schema.Finite),
  },
  CancelledPointer: {},
  PressedEscape: {},
  CompletedAnnounceReorder: {},
  CompletedSizeLiftedItem: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages a sortable reports. `Moved`: an item was dropped somewhere new.
 *  `toIndex` is its place in the list once moved; `maybeAfterItemId` and `maybeBeforeItemId`
 *  name the items it now sits between, the anchors a list ordered by neighbours needs. A drop
 *  where the item already was, outside the list, or while items may not move reports nothing.
 *  The parent moves the item (or decides not to): the data is its own. */
export const OutMessage = defineMessageUnion({
  Moved: {
    itemId: Schema.String,
    fromIndex: Schema.Finite,
    toIndex: Schema.Finite,
    maybeAfterItemId: Schema.Option(Schema.String),
    maybeBeforeItemId: Schema.Option(Schema.String),
  },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a sortable with `init`. The `id` must be unique in the document;
 *  the list's DOM hooks are scoped by it. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a sortable with nothing held. */
export const init = (config: InitConfig): Model => ({
  dragAndDrop: UiDragAndDrop.init({ id: config.id }),
  maybeHeld: Option.none(),
});

const id = (model: Model): string => model.dragAndDrop.id;

const itemHook = (model: Model, itemId: string): string =>
  `${id(model)}/${itemId}`;

const GRIP_ATTRIBUTE = "sortable-grip";

/** Says a step of a move through the page's live region (as `Announcer.Announce` does). */
export const AnnounceReorder = Command.define("AnnounceReorder", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceReorder],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(
      Effect.as(Message.CompletedAnnounceReorder())
    ),
});

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const fill = (
  template: string,
  item: string,
  position = 0,
  total = 0
): string =>
  template
    .replaceAll("{item}", item)
    .replaceAll("{position}", position.toLocaleString(LOCALE))
    .replaceAll("{total}", total.toLocaleString(LOCALE));

const indexOf = (
  items: readonly Item[],
  itemId: string
): Option.Option<number> =>
  Array.findFirstIndex(items, (item) => item.id === itemId);

const targetIndex = (model: Model, held: Held): Option.Option<number> =>
  Option.map(UiDragAndDrop.maybeDropTarget(model.dragAndDrop), ({ index }) =>
    Math.min(Math.max(index, 0), held.items.length - 1)
  );

const placementOf = (held: Held, rawIndex: number): Option.Option<OutMessage> =>
  Option.gen(function* () {
    const fromIndex = yield* indexOf(held.items, held.item.id);
    const others = Array.filter(held.items, (item) => item.id !== held.item.id);
    const toIndex = Math.min(Math.max(rawIndex, 0), others.length);

    if (toIndex === fromIndex) {
      return yield* Option.none();
    }

    return OutMessage.Moved({
      itemId: held.item.id,
      fromIndex,
      toIndex,
      maybeAfterItemId: Option.map(
        Array.get(others, toIndex - 1),
        (item) => item.id
      ),
      maybeBeforeItemId: Option.map(
        Array.get(others, toIndex),
        (item) => item.id
      ),
    });
  });

const foldDragAndDropOutMessage = UiDragAndDrop.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>
>({
  Reordered:
    ({ toIndex }) =>
    (stepModel) =>
      Update.withOutMessage(
        { model: stepModel },
        Option.getOrUndefined(
          Option.flatMap(stepModel.maybeHeld, (held) =>
            placementOf(held, toIndex)
          )
        )
      ),
  Cancelled: () => (stepModel) => ({ model: stepModel }),
});

const toDragAndDropMessage = (message: UiDragAndDrop.Message): Message =>
  Message.GotDragAndDropMessage({ message });

const foldDragAndDrop = Update.foldChild({
  update: UiDragAndDrop.update,
  read: (model: Model) => Option.some(model.dragAndDrop),
  write: (model: Model, nextDragAndDrop: UiDragAndDrop.Model) =>
    modifyFields(model, { dragAndDrop: () => nextDragAndDrop }),
  toParentMessage: toDragAndDropMessage,
  foldOutMessage: foldDragAndDropOutMessage,
});

const positionOf = (index: number): number => index + 1;

const moveText = (
  held: Held,
  previous: Model,
  next: Model,
  maybeOutMessage: Option.Option<OutMessage>,
  putBack: string
): Option.Option<string> => {
  const { label } = held.item;
  const total = held.items.length;
  const before = phaseOf(previous.dragAndDrop);
  const after = phaseOf(next.dragAndDrop);

  if (after === "Idle") {
    return isCarrying(before)
      ? Option.some(
          Option.match(maybeOutMessage, {
            onNone: () => fill(putBack, label),
            onSome: ({ toIndex }) =>
              fill(COPY.dropped, label, positionOf(toIndex), total),
          })
        )
      : Option.none();
  } else if (before === "Pressed" && after === "PointerDragging") {
    return Option.some(fill(COPY.pickedUp, label));
  } else if (before === "Idle" && after === "KeyboardDragging") {
    return Option.map(targetIndex(next, held), (index) =>
      fill(COPY.pickedUpByKeyboard, label, positionOf(index), total)
    );
  } else if (after === "KeyboardDragging") {
    return pipe(
      targetIndex(next, held),
      Option.filter(
        (index) => !Option.contains(targetIndex(previous, held), index)
      ),
      Option.map((index) => fill(COPY.over, label, positionOf(index), total))
    );
  }

  return Option.none();
};

const settle =
  (previous: Model, putBack = COPY.putBack) =>
  (dragAndDropUpdate: UpdateReturn): UpdateReturn =>
    settleDrag(
      dragAndDropUpdate,
      Option.map(
        Option.flatMap(previous.maybeHeld, (held) =>
          moveText(
            held,
            previous,
            dragAndDropUpdate.model,
            Option.fromNullishOr(dragAndDropUpdate.outMessage),
            putBack
          )
        ),
        (text) => AnnounceReorder({ text })
      )
    );

const liftable = (
  model: Model,
  items: readonly Item[],
  itemId: string
): Option.Option<Readonly<{ index: number; item: Item }>> =>
  Option.filter(
    Option.map(
      Array.findFirstWithIndex(items, (item) => item.id === itemId),
      ([item, index]) => ({ index, item })
    ),
    () => canLift(model)
  );

const lift = (
  model: Model,
  held: Held,
  liftMessage: UiDragAndDrop.Message
): UpdateReturn => {
  const pressed = modifyFields(model, { maybeHeld: () => Option.some(held) });

  return settle(pressed)(foldDragAndDrop(pressed, liftMessage));
};

type PointerAt = Readonly<{
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  maybeIndex: Option.Option<number>;
}>;

const pointerMove = (model: Model, pointer: PointerAt): UiDragAndDrop.Message =>
  movedPointer({
    screenX: pointer.screenX,
    screenY: pointer.screenY,
    clientX: pointer.clientX,
    clientY: pointer.clientY,
    maybeDropTarget: Option.map(pointer.maybeIndex, (index) => ({
      containerId: id(model),
      index,
    })),
  });

const isPointerCarrying = (model: Model): boolean =>
  phaseOf(model.dragAndDrop) === "PointerDragging";

const rereadPointerAtRelease = (
  model: Model,
  pointer: PointerAt
): UpdateReturn => foldDragAndDrop(model, pointerMove(model, pointer));

const release = (model: Model, pointer: PointerAt): UpdateReturn => {
  if (!isPointerCarrying(model)) {
    return foldDragAndDrop(model, releasedPointer());
  }

  const moved = rereadPointerAtRelease(model, pointer);
  const released = foldDragAndDrop(moved.model, releasedPointer());

  return Update.withOutMessage(
    {
      model: released.model,
      commands: [...(moved.commands ?? []), ...(released.commands ?? [])],
    },
    released.outMessage
  );
};

const cancelDrag = (model: Model): UpdateReturn =>
  settle(model, COPY.cancelled)(foldDragAndDrop(model, cancelledDrag()));

const updateDragAndDrop = (
  model: Model,
  message: UiDragAndDrop.Message
): UpdateReturn =>
  Match.value(message).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.tag("PressedArrowKey", ({ direction }) =>
      direction === "NextContainer" || direction === "PreviousContainer"
        ? { model }
        : settle(model)(foldDragAndDrop(model, message))
    ),
    Match.tag("CancelledDrag", () => cancelDrag(model)),
    Match.orElse(() => settle(model)(foldDragAndDrop(model, message)))
  );

/** Processes a sortable Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotDragAndDropMessage: ({ message: dragAndDropMessage }) =>
      updateDragAndDrop(model, dragAndDropMessage),
    PressedItem: ({
      itemId,
      pointerId,
      screenX,
      screenY,
      clientX,
      clientY,
      items,
    }) =>
      Option.match(liftable(model, items, itemId), {
        onNone: () => ({ model }),
        onSome: ({ index, item }) =>
          lift(
            model,
            {
              item,
              items,
              maybePress: Option.some({ pointerId, clientX, clientY }),
            },
            pressedDraggable({
              itemId: itemHook(model, itemId),
              containerId: id(model),
              index,
              screenX,
              screenY,
            })
          ),
      }),
    PressedGripKey: ({ itemId, items }) =>
      Option.match(liftable(model, items, itemId), {
        onNone: () => ({ model }),
        onSome: ({ index, item }) =>
          lift(
            model,
            { item, items, maybePress: Option.none() },
            activatedKeyboardDrag({
              itemId: itemHook(model, itemId),
              containerId: id(model),
              index,
            })
          ),
      }),
    MovedPointer: (pointer) =>
      settle(model)(foldDragAndDrop(model, pointerMove(model, pointer))),
    ReleasedPointer: (pointer) => settle(model)(release(model, pointer)),
    CancelledPointer: () =>
      settle(model)(foldDragAndDrop(model, cancelledDrag())),
    PressedEscape: () => cancelDrag(model),
    CompletedAnnounceReorder: () => ({ model }),
    CompletedSizeLiftedItem: () => ({ model }),
  });

const pointerIndex = (
  listId: string,
  heldHook: string,
  clientX: number,
  clientY: number
): Option.Option<number> =>
  pipe(
    Array.findFirst(
      document.elementsFromPoint(clientX, clientY),
      (element) =>
        element instanceof HTMLElement &&
        element.dataset["droppableId"] === listId
    ),
    Option.map((list) => insertionIndex(list, heldHook, clientX, clientY))
  );

const PointerHold = Schema.Struct({
  listId: Schema.String,
  heldHook: Schema.String,
  pointerId: Schema.Finite,
});

type PointerHold = typeof PointerHold.Type;

const pointerAt = (hold: PointerHold, event: PointerEvent): PointerAt => ({
  screenX: event.screenX,
  screenY: event.screenY,
  clientX: event.clientX,
  clientY: event.clientY,
  maybeIndex: pointerIndex(
    hold.listId,
    hold.heldHook,
    event.clientX,
    event.clientY
  ),
});

const pointerMessages = (hold: PointerHold): Stream.Stream<Message> =>
  dragMessages<Message>(hold.pointerId, {
    moved: (event) => Message.MovedPointer(pointerAt(hold, event)),
    released: (event) => Message.ReleasedPointer(pointerAt(hold, event)),
    cancelled: () => Message.CancelledPointer(),
  });

const pointerSubscriptions = Subscription.make<Model, Message>()((entry) => ({
  pointer: entry(
    { maybeHold: Schema.Option(PointerHold) },
    {
      modelToDependencies: (model) => ({
        maybeHold: Option.filter(
          Option.flatMap(model.maybeHeld, ({ item, maybePress }) =>
            Option.map(maybePress, ({ pointerId }) => ({
              listId: id(model),
              heldHook: itemHook(model, item.id),
              pointerId,
            }))
          ),
          () => {
            const phase = phaseOf(model.dragAndDrop);

            return phase === "Pressed" || phase === "PointerDragging";
          }
        ),
      }),
      dependenciesToStream: ({ maybeHold }) =>
        Option.match(maybeHold, {
          onNone: () => Stream.empty,
          onSome: (hold) => Stream.merge(pointerMessages(hold), markDragging),
        }),
    }
  ),
}));

const dragSubscriptions = Subscription.lift({
  keyboard: UiDragAndDrop.subscriptions.documentKeyboard,
  autoScroll: UiDragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  read: (model) => Option.some(model.dragAndDrop),
  toParentMessage: toDragAndDropMessage,
});

const sortableSubscriptions = Subscription.aggregate(
  pointerSubscriptions,
  escapeSubscriptions<Model, Message>(Message.PressedEscape()),
  dragSubscriptions
);

/** A held item follows the pointer, the arrows and Space move and drop it, Escape puts it back
 *  and the page scrolls near its edges, from listeners that run only while an item is pressed
 *  or held. Lift them into the application's Subscriptions, once per list, behind a key prefix
 *  of the parent's: `subscriptions("order")` is keyed `orderPointer`, `orderEscape`,
 *  `orderKeyboard` and `orderAutoScroll`. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, sortableSubscriptions);

/** Sizes the copy that follows the pointer to the item it lifts, and keeps the pointer where
 *  it pressed the item. Measures the item once, when the copy appears. */
export const SizeLiftedItem = Mount.define("SizeLiftedItem", {
  args: {
    itemHook: Schema.String,
    pressX: Schema.Finite,
    pressY: Schema.Finite,
  },
  messages: [Message.CompletedSizeLiftedItem],
  execute: ({ element, itemHook: hook, pressX, pressY }) =>
    Effect.sync(() => {
      measureLift(
        element,
        `[data-sortable-id="${CSS.escape(hook)}"]`,
        pressX,
        pressY
      );

      return Message.CompletedSizeLiftedItem();
    }),
});

/** How the items lay out: a column of rows, tiles that wrap, or the parent's own panels. */
export type Layout = "List" | "Grid" | "Panels";

/** What the list hands `toItemView` for each item. */
export type ItemRender = Readonly<{
  /** This render is the held copy: hidden from screen readers and inert. Leave out ids and
   *  anything the page must find once. */
  isLifted: boolean;
  /** The item's grip, for the `"Panels"` layout, where the item places it: in its panel's
   *  `lead`. The other layouts print it before the item themselves. */
  grip: Html;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. The `to*` members
 *  are functions because they may carry the parent's handlers. */
export type ViewInputs = Readonly<{
  items: readonly Item[];
  /** Names the list for screen readers. */
  label: string;
  /** `"List"` (the default): rows between 1px rules, for a flush panel. `"Grid"`: tiles that
   *  wrap, 180px and up. `"Panels"`: each item is a Panel the parent prints, with `render.grip`
   *  in its `lead`, up to three across in the deck's gutter, 300px and up. */
  layout?: Layout;
  /** The reader may look but not reorder, as a read-only sign-in: every grip prints held, as
   *  while moves are held, and nothing lifts. */
  isReadOnly?: boolean;
  /** One item's content, beside its grip. Also called for the held copy, with
   *  `render.isLifted`. */
  toItemView: (item: Item, render: ItemRender) => readonly Html[];
}>;

type ListInfo = Readonly<{
  model: Model;
  layout: Layout;
  isMovable: boolean;
  items: readonly Item[];
  maybeDropMark: Option.Option<DropMark>;
  toItemView: (item: Item, render: ItemRender) => readonly Html[];
}>;

const helpId = (model: Model): string => `${id(model)}-grip-help`;

const isHeldItem = (model: Model, itemId: string): boolean =>
  UiDragAndDrop.isDragging(model.dragAndDrop) &&
  Option.contains(
    UiDragAndDrop.maybeDraggedItemId(model.dragAndDrop),
    itemHook(model, itemId)
  );

const liftedGrip = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
  h.span(
    [h.Class("iconbtn quiet"), h.AriaHidden(true)],
    [Glyph.view({ name: "grip" }, h)]
  );

const itemContents = <ParentMessage>(
  info: ListInfo,
  item: Item,
  render: ItemRender,
  h: HtmlBuilder<ParentMessage>
): readonly Html[] => {
  const body = h.div([h.Class("sortable-body")], info.toItemView(item, render));

  return info.layout === "Panels" ? [body] : [render.grip, body];
};

const liftedView = <ParentMessage>(
  info: ListInfo,
  item: Item,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.div(
    [h.Class("sortable-item lifted")],
    itemContents(info, item, { isLifted: true, grip: liftedGrip(h) }, h)
  );

const gripView = (
  info: ListInfo,
  item: Item,
  h: HtmlBuilder<Message>
): Html => {
  const { model, isMovable, items } = info;
  const isIdleNow = phaseOf(model.dragAndDrop) === "Idle";

  const onGripKey: Attribute<Message> = h.OnKeyDownPreventDefault((key) =>
    Option.liftPredicate(
      Message.PressedGripKey({ itemId: item.id, items }),
      () => isIdleNow && (key === " " || key === "Enter")
    )
  );

  const onGripPress: Attribute<Message> = h.OnPointerDown(
    (
      _pointerType,
      button,
      screenX,
      screenY,
      _time,
      clientX,
      clientY,
      pointerId
    ) =>
      Option.liftPredicate(
        Message.PressedItem({
          itemId: item.id,
          pointerId,
          screenX,
          screenY,
          clientX,
          clientY,
          items,
        }),
        () => isIdleNow && button === LEFT_BUTTON
      )
  );

  return IconButton.view(
    {
      glyph: "grip",
      label: fill(COPY.gripLabel, item.label),
      isQuiet: true,
      isDisabled: !isMovable,
      attributes: [
        h.DataAttribute("draggable-id", itemHook(model, item.id)),
        h.DataAttribute(GRIP_ATTRIBUTE, ""),
        h.AriaRoleDescription("draggable"),
        h.AriaDescribedBy(helpId(model)),
        Button.pressedAttribute(isHeldItem(model, item.id), h),
        ...(isMovable ? [onGripKey, onGripPress] : []),
      ],
    },
    h
  );
};

type DropMark = Readonly<{ itemId: string; side: "Before" | "After" }>;

const dropMarkOf = (model: Model): Option.Option<DropMark> =>
  pipe(
    model.maybeHeld,
    Option.filter(() => phaseOf(model.dragAndDrop) === "PointerDragging"),
    Option.flatMap((held) =>
      pipe(
        targetIndex(model, held),
        Option.filter(
          (index) => !Option.contains(indexOf(held.items, held.item.id), index)
        ),
        Option.flatMap((index) => {
          const others = Array.filter(
            held.items,
            (item) => item.id !== held.item.id
          );

          return Option.orElse(
            Option.map(Array.get(others, index), (item): DropMark => ({
              itemId: item.id,
              side: "Before",
            })),
            () =>
              Option.map(Array.last(others), (item): DropMark => ({
                itemId: item.id,
                side: "After",
              }))
          );
        })
      )
    )
  );

const dropClass = (info: ListInfo, item: Item): string =>
  Option.match(
    Option.filter(info.maybeDropMark, ({ itemId }) => itemId === item.id),
    {
      onNone: () => "",
      onSome: ({ side }) =>
        side === "Before" ? " drop-before" : " drop-after",
    }
  );

const itemClass = (info: ListInfo, item: Item): string =>
  `sortable-item${info.isMovable ? " movable" : ""}${isHeldItem(info.model, item.id) ? " drag-dim" : ""}${dropClass(info, item)}`;

const itemView = (info: ListInfo, item: Item, h: HtmlBuilder<Message>): Html =>
  h.keyed("li")(
    item.id,
    [
      ...UiDragAndDrop.sortable(itemHook(info.model, item.id)),
      h.Class(itemClass(info, item)),
    ],
    itemContents(
      info,
      item,
      { isLifted: false, grip: gripView(info, item, h) },
      h
    )
  );

const itemsView = (
  info: ListInfo,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model, items } = info;

  const rows = Array.map(items, (item) => ({
    item,
    html: itemView(info, item, h),
  }));

  const maybeSlot = pipe(
    model.maybeHeld,
    Option.filter(() => phaseOf(model.dragAndDrop) === "KeyboardDragging"),
    Option.flatMap((held) =>
      Option.map(targetIndex(model, held), (index) => ({ held, index }))
    )
  );

  return Option.match(maybeSlot, {
    onNone: () => Array.map(rows, ({ html }) => html),
    onSome: ({ held, index }) => {
      const slot = h.keyed("li")(
        "sortable-slot",
        [h.Class("sortable-slot"), h.AriaHidden(true), h.Inert(true)],
        [liftedView(info, held.item, h)]
      );

      const others = Array.filter(rows, ({ item }) => item.id !== held.item.id);
      const maybeBefore = Array.get(others, index);

      return Option.match(maybeBefore, {
        onNone: () => [...Array.map(rows, ({ html }) => html), slot],
        onSome: (before) =>
          Array.flatMap(rows, ({ item, html }) =>
            item.id === before.item.id ? [slot, html] : [html]
          ),
      });
    },
  });
};

const liftedCopyView = (
  info: ListInfo,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model } = info;

  const maybeLifted = Option.all({
    style: UiDragAndDrop.ghostStyle(model.dragAndDrop),
    held: model.maybeHeld,
    press: Option.flatMap(model.maybeHeld, ({ maybePress }) => maybePress),
  });

  return Array.fromOption(
    Option.map(maybeLifted, ({ style, held, press }) =>
      h.div(
        [
          h.Class("sortable-lift"),
          h.Style(style),
          h.AriaHidden(true),
          h.Inert(true),
          h.OnMount(
            SizeLiftedItem({
              itemHook: itemHook(model, held.item.id),
              pressX: press.clientX,
              pressY: press.clientY,
            })
          ),
        ],
        [liftedView(info, held.item, h)]
      )
    )
  );
};

const layoutClass = (layout: Layout): string =>
  Match.value(layout).pipe(
    Match.withReturnType<string>(),
    Match.when("List", () => "sortable"),
    Match.when("Grid", () => "sortable grid"),
    Match.when("Panels", () => "sortable panels"),
    Match.exhaustive
  );

/**
 * Items the reader puts in order, as rows, as tiles or as panels, built on `@foldkit/ui`'s
 * DragAndDrop: `div.sortable` holding `ul.sortable-items` (named by `label`) of
 * `li.sortable-item`, each its grip and the parent's content (a panel holds its grip in its
 * title bar). The items are the parent's; a drop reports `Moved`.
 *
 * Only the grip lifts an item, under every pointer, so the item's own text selects and a
 * finger on it scrolls the page; the keyboard takes the grip too: Space or Enter picks the
 * item up, every arrow moves it one place in reading order, Space drops it and Escape puts it back.
 * The held item dims in place; a copy, lifted onto the card shadow, follows the pointer or
 * prints where the keyboard would drop it; each step is said through the page's live region.
 * Lift `subscriptions(keyPrefix)` into the application's, or nothing follows the pointer or
 * the keys.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      items,
      label,
      layout = "List",
      isReadOnly = false,
      toItemView,
    } = viewInputs;

    const info: ListInfo = {
      model,
      layout,
      isMovable: !isReadOnly,
      items,
      maybeDropMark: dropMarkOf(model),
      toItemView,
    };

    return h.div(
      [h.Class(layoutClass(layout))],
      [
        h.ul(
          [
            h.DataAttribute("droppable-id", id(model)),
            h.Role("list"),
            h.AriaLabel(label),
            h.Class("sortable-items"),
          ],
          itemsView(info, h)
        ),
        h.p([h.Id(helpId(model)), h.Class("sr-only")], [COPY.gripHelp]),
        ...liftedCopyView(info, h),
      ]
    );
  }
);
