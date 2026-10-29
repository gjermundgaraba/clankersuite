import { Button as UiButton, DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Array, Effect, Equal, Match, Option, Schema, pipe } from "effect";
import * as Command from "foldkit/command";
import { childAttributes } from "foldkit/html";
import type {
  Attribute,
  ChildAttribute,
  Html,
  HtmlBuilder,
} from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import * as Announcer from "../announcer/announcer.ts";
import type { Attributes } from "../attributes/attributes.ts";
import * as Button from "../button/button.ts";
import {
  LEFT_BUTTON,
  activatedKeyboardDrag,
  canLift,
  cancelledDrag,
  escapeSubscriptions,
  innerControls,
  isCarrying,
  measureLift,
  phaseOf,
  pressedDraggable,
  settle as settleDrag,
} from "../drag/drag.ts";
import * as Glyph from "../glyph/glyph.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { LOCALE } from "../locale/locale.ts";
import { slotView } from "../slot/slot.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";

/** Schema for one card as the board knows it: its id, unique across the board, and its name
 *  in words, which the grip and screen readers use. */
export const Card = Schema.Struct({ id: Schema.String, label: Schema.String });

export type Card = typeof Card.Type;

/** Schema for one column: its id, its title, and its cards in order. */
export const Column = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  cards: Schema.Array(Card),
});

export type Column = typeof Column.Type;

const KEYBOARD_MOVES =
  "Arrow keys move it to another column, space drops it, escape cancels.";

const COPY = {
  gripLabel: "Move {card}",
  gripHelp: `Press space to pick the card up. ${KEYBOARD_MOVES}`,
  pickedUp: "Picked up {card}.",
  pickedUpByKeyboard: `Picked up {card}. ${KEYBOARD_MOVES}`,
  over: "{card} is over {column}.",
  dropped: "{card} dropped in {column}.",
  putBack: "{card} put back where it was.",
  cancelled: "Move cancelled. {card} put back where it was.",
};

const PressPoint = Schema.Struct({
  clientX: Schema.Finite,
  clientY: Schema.Finite,
});

const Held = Schema.Struct({
  card: Card,
  columnsAtPress: Schema.Array(Column),
  maybePressPoint: Schema.Option(PressPoint),
});

type Held = typeof Held.Type;

/** Schema for a board: the `@foldkit/ui` DragAndDrop it moves cards with, whether cards may
 *  move, and what it keeps while a card is held. The cards and columns are the parent's. */
export const Model = Schema.Struct({
  dragAndDrop: UiDragAndDrop.Model,
  isMovable: Schema.Boolean,
  maybeHeld: Schema.Option(Held),
});

export type Model = typeof Model.Type;

const PressSpot = Schema.Literals(["Body", "Grip"]);

type PressSpot = typeof PressSpot.Type;

/** Union of all Messages a board can produce. */
export const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: UiDragAndDrop.Message },
  PressedCard: {
    cardId: Schema.String,
    spot: PressSpot,
    pointerType: Schema.String,
    screenX: Schema.Finite,
    screenY: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    columnsAtPress: Schema.Array(Column),
  },
  PressedGripKey: {
    cardId: Schema.String,
    columnsAtPress: Schema.Array(Column),
  },
  PressedEscape: {},
  CompletedAnnounceMove: {},
  CompletedSizeLiftedCard: {},
});

export type Message = typeof Message.Type;

/**
 * Union of OutMessages a board reports.
 *
 * - `Moved`: a card was dropped somewhere new. `toIndex` is its place among the destination
 *   column's other cards; `maybeAfterCardId` and `maybeBeforeCardId` name the cards it now
 *   sits between, the anchors a list that orders by neighbours needs. A drop where the card
 *   already was, over no column, or while cards may not move reports nothing. The parent
 *   moves the item (or decides not to): the data is its own.
 * - `SelectedCard`: a primary press on a card's body, not on a control inside it (an input,
 *   a link, a button other than the title, `[data-no-lift]`) nor its grip.
 */
export const OutMessage = defineMessageUnion({
  Moved: {
    cardId: Schema.String,
    fromColumnId: Schema.String,
    fromIndex: Schema.Finite,
    toColumnId: Schema.String,
    toIndex: Schema.Finite,
    maybeAfterCardId: Schema.Option(Schema.String),
    maybeBeforeCardId: Schema.Option(Schema.String),
  },
  SelectedCard: { cardId: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a board with `init`. The `id` must be unique in the document;
 *  the board's DOM hooks are scoped by it, so two boards on a page keep to their own cards. */
export type InitConfig = Readonly<{
  id: string;
  /** Whether cards may move from the start (the default); false for a board whose moves wait
   *  on something (writes not yet accepted), which `setMovable` turns on later. */
  isMovable?: boolean;
}>;

/** Creates a board with nothing held, its cards free to move unless `isMovable` is false
 *  (`setMovable` changes it). */
export const init = (config: InitConfig): Model => ({
  dragAndDrop: UiDragAndDrop.init({ id: config.id }),
  isMovable: config.isMovable ?? true,
  maybeHeld: Option.none(),
});

/** The board's id, unique in the document. */
export const id = (model: Model): string => model.dragAndDrop.id;

export const isDragging = (model: Model): boolean =>
  UiDragAndDrop.isDragging(model.dragAndDrop);

const hookId = (boardId: string, localId: string): string =>
  `${boardId}/${localId}`;

const cardHook = (model: Model, cardId: string): string =>
  hookId(id(model), cardId);

const columnHook = (model: Model, columnId: string): string =>
  hookId(id(model), columnId);

const CARD_ATTRIBUTE = "board-card";
const TITLE_ATTRIBUTE = "board-title";
const GRIP_ATTRIBUTE = "board-grip";

/** Says a step of a move through the page's live region (as `Announcer.Announce` does), which is
 *  inside the topmost open dialog when there is one. */
export const AnnounceMove = Command.define("AnnounceMove", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceMove],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(Effect.as(Message.CompletedAnnounceMove())),
});

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

type Direction =
  (typeof UiDragAndDrop.Message.PressedArrowKey.Type)["direction"];

type Place = Readonly<{ card: Card; column: Column; index: number }>;

const placeOf = (
  columns: readonly Column[],
  cardId: string
): Option.Option<Place> =>
  Array.findFirst(columns, (column) =>
    Array.findFirst(
      Array.map(column.cards, (card, index) => ({ card, column, index })),
      ({ card }) => card.id === cardId
    )
  );

const fill = (template: string, card: string, column = ""): string =>
  template.replaceAll("{card}", card).replaceAll("{column}", column);

const columnOfHook = (
  model: Model,
  held: Held,
  hook: string
): Option.Option<Column> =>
  Array.findFirst(
    held.columnsAtPress,
    (column) => columnHook(model, column.id) === hook
  );

const overColumn = (model: Model): Option.Option<Column> =>
  Option.flatMap(model.maybeHeld, (held) =>
    Option.flatMap(
      UiDragAndDrop.maybeDropTarget(model.dragAndDrop),
      ({ containerId }) => columnOfHook(model, held, containerId)
    )
  );

const placementOf = (
  model: Model,
  held: Held,
  toContainerId: string,
  rawIndex: number
): Option.Option<OutMessage> =>
  Option.gen(function* () {
    const from = yield* placeOf(held.columnsAtPress, held.card.id);
    const to = yield* columnOfHook(model, held, toContainerId);
    const others = Array.filter(to.cards, (card) => card.id !== held.card.id);
    const isSameColumn = to.id === from.column.id;
    const isKeyboard = Option.isNone(held.maybePressPoint);

    const pastItself =
      isSameColumn && rawIndex > from.index ? rawIndex - 1 : rawIndex;

    const toIndex = Math.min(Math.max(pastItself, 0), others.length);
    const isWhereItWas = isSameColumn && (isKeyboard || toIndex === from.index);

    if (isWhereItWas || !model.isMovable) {
      return yield* Option.none();
    }

    return OutMessage.Moved({
      cardId: held.card.id,
      fromColumnId: from.column.id,
      fromIndex: from.index,
      toColumnId: to.id,
      toIndex,
      maybeAfterCardId: Option.map(
        Array.get(others, toIndex - 1),
        (card) => card.id
      ),
      maybeBeforeCardId: Option.map(
        Array.get(others, toIndex),
        (card) => card.id
      ),
    });
  });

const foldDragAndDropOutMessage = UiDragAndDrop.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>
>({
  Reordered:
    ({ toContainerId, toIndex }) =>
    (stepModel) =>
      Update.withOutMessage(
        { model: stepModel },
        Option.getOrUndefined(
          Option.flatMap(stepModel.maybeHeld, (held) =>
            placementOf(stepModel, held, toContainerId, toIndex)
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

const moveText = (
  held: Held,
  previous: Model,
  next: Model,
  maybeOutMessage: Option.Option<OutMessage>,
  putBack: string
): Option.Option<string> => {
  const { label } = held.card;
  const before = phaseOf(previous.dragAndDrop);
  const after = phaseOf(next.dragAndDrop);

  const maybeMoved = Option.filter(
    maybeOutMessage,
    (outMessage) => outMessage._tag === "Moved"
  );

  if (after === "Idle") {
    return isCarrying(before)
      ? Option.some(
          Option.match(
            Option.flatMap(maybeMoved, () => overColumn(previous)),
            {
              onNone: () => fill(putBack, label),
              onSome: (column) => fill(COPY.dropped, label, column.title),
            }
          )
        )
      : Option.none();
  } else if (before === "Pressed" && after === "PointerDragging") {
    return Option.some(fill(COPY.pickedUp, label));
  } else if (before === "Idle" && after === "KeyboardDragging") {
    return Option.some(fill(COPY.pickedUpByKeyboard, label));
  }

  return pipe(
    overColumn(next),
    Option.filter(
      (column) =>
        !Equal.equals(
          Option.map(overColumn(previous), (over) => over.id),
          Option.some(column.id)
        )
    ),
    Option.map((column) => fill(COPY.over, label, column.title))
  );
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
        (text) => AnnounceMove({ text })
      )
    );

const holding = (model: Model, held: Held): Model =>
  modifyFields(model, { maybeHeld: () => Option.some(held) });

const liftByKeyboard = (
  model: Model,
  place: Place,
  columnsAtPress: readonly Column[]
) => {
  const pressed = holding(model, {
    card: place.card,
    columnsAtPress,
    maybePressPoint: Option.none(),
  });

  return settle(pressed)(
    foldDragAndDrop(
      pressed,
      activatedKeyboardDrag({
        itemId: cardHook(model, place.card.id),
        containerId: columnHook(model, place.column.id),
        index: place.index,
      })
    )
  );
};

const toColumnStepInReadingOrder = (direction: Direction): Direction =>
  Match.value(direction).pipe(
    Match.withReturnType<Direction>(),
    Match.whenOr("Left", "Up", () => "PreviousContainer"),
    Match.whenOr("Right", "Down", () => "NextContainer"),
    Match.orElse(() => direction)
  );

const moveByKeyboard = (model: Model, direction: Direction): UpdateReturn =>
  Option.match(
    Option.filter(
      Option.all({
        itemId: UiDragAndDrop.maybeDraggedItemId(model.dragAndDrop),
        target: UiDragAndDrop.maybeDropTarget(model.dragAndDrop),
      }),
      () => phaseOf(model.dragAndDrop) === "KeyboardDragging"
    ),
    {
      onNone: () => ({ model }),
      onSome: ({ itemId, target }) => ({
        model,
        commands: [
          Command.mapMessage(
            UiDragAndDrop.ResolveKeyboardMove({
              itemId,
              currentContainerId: target.containerId,
              currentIndex: target.index,
              direction: toColumnStepInReadingOrder(direction),
            }),
            toDragAndDropMessage
          ),
        ],
      }),
    }
  );

const isOwnColumnHook = (model: Model, hook: string): boolean =>
  Option.exists(model.maybeHeld, (held) =>
    Option.isSome(columnOfHook(model, held, hook))
  );

const cancelDrag = (
  model: Model,
  message: UiDragAndDrop.Message
): UpdateReturn =>
  settle(model, COPY.cancelled)(foldDragAndDrop(model, message));

const updateDragAndDrop = (
  model: Model,
  message: UiDragAndDrop.Message
): UpdateReturn =>
  Match.value(message).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.tag("PressedArrowKey", ({ direction }) =>
      moveByKeyboard(model, direction)
    ),
    Match.tag("CompletedResolveKeyboardMove", ({ targetContainerId }) =>
      isOwnColumnHook(model, targetContainerId)
        ? settle(model)(foldDragAndDrop(model, message))
        : { model }
    ),
    Match.tag("CancelledDrag", () => cancelDrag(model, message)),
    Match.orElse(() => settle(model)(foldDragAndDrop(model, message)))
  );

const pressCard =
  (model: Model) =>
  ({
    cardId,
    spot,
    pointerType,
    screenX,
    screenY,
    clientX,
    clientY,
    columnsAtPress,
  }: typeof Message.PressedCard.Type): UpdateReturn => {
    const maybeSelected = Option.liftPredicate(
      OutMessage.SelectedCard({ cardId }),
      () => spot === "Body" && phaseOf(model.dragAndDrop) === "Idle"
    );

    const isLifting =
      canLift(model) && (spot === "Grip" || pointerType === "mouse");

    const press = Option.match(
      Option.filter(placeOf(columnsAtPress, cardId), () => isLifting),
      {
        onNone: (): UpdateReturn => ({ model }),
        onSome: (place) => {
          const pressed = holding(model, {
            card: place.card,
            columnsAtPress,
            maybePressPoint: Option.some({ clientX, clientY }),
          });

          return settle(pressed)(
            foldDragAndDrop(
              pressed,
              pressedDraggable({
                itemId: cardHook(model, cardId),
                containerId: columnHook(model, place.column.id),
                index: place.index,
                screenX,
                screenY,
              })
            )
          );
        },
      }
    );

    return Option.match(maybeSelected, {
      onNone: () => press,
      onSome: (selected) => ({ ...press, outMessage: selected }),
    });
  };

/**
 * Puts a pressed or held card back where it was, says so, and reports no move. A keyboard
 * move hands focus back to the card's grip. Call it when the layout changes under the board.
 */
export const cancel = (model: Model): UpdateReturn =>
  cancelDrag(model, cancelledDrag());

/** Processes a board Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotDragAndDropMessage: ({ message: dragAndDropMessage }) =>
      updateDragAndDrop(model, dragAndDropMessage),
    PressedCard: pressCard(model),
    PressedGripKey: ({ cardId, columnsAtPress }) =>
      Option.match(
        Option.filter(placeOf(columnsAtPress, cardId), () => canLift(model)),
        {
          onNone: () => ({ model }),
          onSome: (place) => liftByKeyboard(model, place, columnsAtPress),
        }
      ),
    PressedEscape: () => cancel(model),
    CompletedAnnounceMove: () => ({ model }),
    CompletedSizeLiftedCard: () => ({ model }),
  });

/**
 * Lets cards move, or stops them: while work runs, nothing moves. Stopping cancels a card
 * that is pressed or held, so no `Moved` arrives for it.
 */
export const setMovable = (model: Model, isMovable: boolean): UpdateReturn => {
  const next = modifyFields(model, { isMovable: () => isMovable });

  return isMovable ? { model: next } : cancel(next);
};

const dragSubscriptions = Subscription.lift({
  pointer: UiDragAndDrop.subscriptions.documentPointer,
  keyboard: UiDragAndDrop.subscriptions.documentKeyboard,
  autoScroll: UiDragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  read: (model) => Option.some(model.dragAndDrop),
  toParentMessage: toDragAndDropMessage,
});

const boardSubscriptions = Subscription.aggregate(
  escapeSubscriptions<Model, Message>(Message.PressedEscape()),
  dragSubscriptions
);

/** A held card follows the pointer, the arrows and Space move and drop it, Escape puts it
 *  back and the page scrolls near its edges, all from listeners that run only while a card is
 *  pressed or held. Lift them into the application's Subscriptions, once per board, with a
 *  key prefix of the parent's that no other record on the page uses:
 *  `subscriptions("queueBoard")` is keyed `queueBoardEscape`, `queueBoardPointer`,
 *  `queueBoardKeyboard` and `queueBoardAutoScroll`, so two boards (or a board beside another
 *  DragAndDrop user) aggregate side by side. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, boardSubscriptions);

/** Sizes the copy that follows the pointer to the card it lifts, and keeps the pointer where
 *  it pressed the card. Measures the card once, when the copy appears. */
export const SizeLiftedCard = Mount.define("SizeLiftedCard", {
  args: {
    cardHook: Schema.String,
    pressX: Schema.Finite,
    pressY: Schema.Finite,
  },
  messages: [Message.CompletedSizeLiftedCard],
  execute: ({ element, cardHook: hook, pressX, pressY }) =>
    Effect.sync(() => {
      measureLift(
        element,
        `[data-sortable-id="${CSS.escape(hook)}"]`,
        pressX,
        pressY
      );

      return Message.CompletedSizeLiftedCard();
    }),
});

/** What the board hands `toCardView` for each card. Pass it to `cardView` as `render`. */
export type CardRender = Readonly<{
  /** For the card's root: the press that selects it, and lifts it under a mouse. */
  attributes: readonly ChildAttribute[];
  /** Cards may move: the card prints the grab cursor (`movable`). */
  isMovable: boolean;
  /** The card is the one held: it dims in place (`drag-dim`). */
  isHeld: boolean;
  /** The grip, last in the meta row: a quiet glyph button named "Move <label>" that touch and
   *  the keyboard take. Empty when cards may not move. */
  grip: readonly Html[];
  /** This render is the held copy (`lifted`): hidden from screen readers and inert, taking
   *  none of the caller's attributes. */
  isLifted: boolean;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. The `to*`
 *  members are functions because a Submodel's viewInputs may hold functions only at the top
 *  level: Foldkit runs them in the parent's boundary, so handlers in what they return
 *  dispatch the parent's Messages. */
export type ViewInputs = Readonly<{
  columns: readonly Column[];
  /** Renders one card, usually with `Board.cardView`. It is also called for the held copy,
   *  with `render.isLifted`. */
  toCardView: (card: Card, render: CardRender) => Html;
  /** What a column holding nothing prints, usually an EmptyState. */
  toEmptyView?: (column: Column) => readonly Html[];
  /** Controls at the right of a column's head, after its count ("capture here"). */
  toColumnActions?: (column: Column) => readonly Html[];
}>;

const INNER_CONTROL = innerControls(
  `[data-${TITLE_ATTRIBUTE}], [data-${GRIP_ATTRIBUTE}]`
);

const isInside = (outer: Element, inner: Element | null): boolean =>
  inner !== null && outer.contains(inner);

const pressSpotOf = (target: EventTarget | null): Option.Option<PressSpot> => {
  if (!(target instanceof Element)) {
    return Option.some("Body");
  }

  const maybeCard = Option.fromNullishOr(
    target.closest(`[data-${CARD_ATTRIBUTE}]`)
  );

  const isOnControl = Option.exists(maybeCard, (card) =>
    isInside(card, target.closest(INNER_CONTROL))
  );

  const isOnGrip = target.closest(`[data-${GRIP_ATTRIBUTE}]`) !== null;

  if (isOnControl) {
    return Option.none();
  } else if (isOnGrip) {
    return Option.some("Grip");
  }

  return Option.some("Body");
};

type PlaceInfo = Readonly<{
  model: Model;
  columns: readonly Column[];
  toCardView: (card: Card, render: CardRender) => Html;
  toEmptyView: (column: Column) => readonly Html[];
  toColumnActions: (column: Column) => readonly Html[];
}>;

const gripHelpId = (model: Model): string => `${id(model)}-grip-help`;

const isHeldCard = (model: Model, cardId: string): boolean =>
  isDragging(model) &&
  Option.exists(
    UiDragAndDrop.maybeDraggedItemId(model.dragAndDrop),
    (heldHook) => heldHook === cardHook(model, cardId)
  );

const liftedRender = <ParentMessage>(
  h: HtmlBuilder<ParentMessage>
): CardRender => ({
  attributes: childAttributes([h.AriaHidden(true), h.Inert(true)]),
  isMovable: false,
  isHeld: false,
  grip: [
    h.span(
      [
        h.Class("iconbtn"),
        h.DataAttribute(GRIP_ATTRIBUTE, ""),
        h.AriaHidden(true),
      ],
      [Glyph.view({ name: "grip" }, h)]
    ),
  ],
  isLifted: true,
});

const cardRender = (
  info: PlaceInfo,
  place: Place,
  h: HtmlBuilder<Message>
): CardRender => {
  const { model, columns } = info;
  const { card } = place;
  const isIdleNow = phaseOf(model.dragAndDrop) === "Idle";
  const isHeld = isHeldCard(model, card.id);

  const onPress: Attribute<Message> = h.OnPointerDown(
    (
      pointerType,
      button,
      screenX,
      screenY,
      _time,
      clientX,
      clientY,
      _pointerId,
      target
    ) =>
      Option.map(
        Option.filter(
          pressSpotOf(target),
          () => isIdleNow && button === LEFT_BUTTON
        ),
        (spot) =>
          Message.PressedCard({
            cardId: card.id,
            spot,
            pointerType,
            screenX,
            screenY,
            clientX,
            clientY,
            columnsAtPress: columns,
          })
      )
  );

  const onGripKey = h.OnKeyDownPreventDefault((key) =>
    Option.liftPredicate(
      Message.PressedGripKey({ cardId: card.id, columnsAtPress: columns }),
      () => isIdleNow && (key === " " || key === "Enter")
    )
  );

  const grip = model.isMovable
    ? [
        IconButton.view(
          {
            glyph: "grip",
            label: fill(COPY.gripLabel, card.label),
            isQuiet: true,
            attributes: [
              h.DataAttribute("draggable-id", cardHook(model, card.id)),
              h.DataAttribute(GRIP_ATTRIBUTE, ""),
              h.AriaRoleDescription("draggable"),
              h.AriaDescribedBy(gripHelpId(model)),
              Button.pressedAttribute(isHeld, h),
              onGripKey,
            ],
          },
          h
        ),
      ]
    : [];

  return {
    attributes: childAttributes([h.DataAttribute(CARD_ATTRIBUTE, ""), onPress]),
    isMovable: model.isMovable,
    isHeld,
    grip,
    isLifted: false,
  };
};

const cardClass = ({
  isMovable: movable,
  isHeld,
  isLifted,
}: CardRender): string =>
  `board-card${movable ? " movable" : ""}${isHeld ? " drag-dim" : ""}${isLifted ? " lifted" : ""}`;

/** Configuration for rendering one card with `cardView`. */
export type CardViewConfig<ParentMessage> = Readonly<{
  /** What the board handed `toCardView`. */
  render: CardRender;
  title: string;
  /** Opens the item: the title is its button. */
  onOpen?: ParentMessage;
  /** Opening is not possible now: the title is held (`aria-disabled`) and keeps its place in
   *  the keyboard. */
  isDisabled?: boolean;
  /** Shown in the title's place while the card's title is edited, such as an `InlineInput`
   *  and its `errorView`. The held copy shows `title`. */
  editor?: ReadonlyArray<Html | string>;
  /** The meta row under the title: a mark, a tag, a chip; `span.gap` pushes what follows
   *  right. A press on a control here neither selects nor lifts the card. */
  meta?: ReadonlyArray<Html | string>;
  /** Further attributes for the card (an id, `aria-current`), never a class. The held copy
   *  takes none of them. */
  attributes?: Attributes<ParentMessage>;
}>;

/**
 * One card on the board, from what the board handed `toCardView`: `article.board-card`, a
 * paper slip on the 3px print shadow, its title a two-line `button.title` (or `span.title`
 * without `onOpen`, or the `editor` while the title is edited) over `div.meta-row`, which
 * ends in the grip. Spread
 * `aria-current="true"` through `attributes` for the board's cursor, which prints inverted.
 */
export const cardView = <ParentMessage>(
  config: CardViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const {
    render,
    title,
    onOpen,
    isDisabled = false,
    editor = [],
    meta = [],
  } = config;

  const attributes = render.isLifted ? [] : (config.attributes ?? []);
  const isEditing = !render.isLifted && Array.isReadonlyArrayNonEmpty(editor);

  const titleView =
    onOpen === undefined
      ? h.span([h.Class("title")], [title])
      : UiButton.view(
          {
            onClick: onOpen,
            isDisabled,
            toView: (groups) =>
              h.button(
                [
                  ...groups.button,
                  h.DataAttribute(TITLE_ATTRIBUTE, ""),
                  h.Class("title"),
                ],
                [title]
              ),
          },
          h
        );

  return h.article(
    [...attributes, ...render.attributes, h.Class(cardClass(render))],
    [
      ...(isEditing ? editor : [titleView]),
      ...slotView("div", "meta-row", [...meta, ...render.grip], h),
    ]
  );
};

const cardItemView = (
  info: PlaceInfo,
  place: Place,
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("li")(
    place.card.id,
    [...UiDragAndDrop.sortable(cardHook(info.model, place.card.id))],
    [info.toCardView(place.card, cardRender(info, place, h))]
  );

const keyboardSlot = (
  info: PlaceInfo,
  column: Column,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model } = info;

  const maybeSlot = pipe(
    Option.all({ held: model.maybeHeld, over: overColumn(model) }),
    Option.filter(
      ({ held, over }) =>
        phaseOf(model.dragAndDrop) === "KeyboardDragging" &&
        over.id === column.id &&
        !Array.some(column.cards, (card) => card.id === held.card.id)
    )
  );

  return Array.fromOption(
    Option.map(maybeSlot, ({ held }) =>
      h.keyed("li")(
        "board-lift-slot",
        [h.Class("board-lift-slot"), h.AriaHidden(true)],
        [info.toCardView(held.card, liftedRender(h))]
      )
    )
  );
};

const columnView = (
  info: PlaceInfo,
  column: Column,
  h: HtmlBuilder<Message>
): Html => {
  const { model } = info;
  const headingId = `${id(model)}-${column.id}-title`;

  const items = [
    ...keyboardSlot(info, column, h),
    ...Array.map(column.cards, (card, index) =>
      cardItemView(info, { card, column, index }, h)
    ),
  ];

  const isTarget =
    isDragging(model) &&
    Equal.equals(
      Option.map(overColumn(model), ({ id: overId }) => overId),
      Option.some(column.id)
    );

  return h.keyed("div")(
    column.id,
    [
      h.DataAttribute("droppable-id", columnHook(model, column.id)),
      h.Class(isTarget ? "board-col drop-target" : "board-col"),
    ],
    [
      h.section(
        [h.Class("panel"), h.AriaLabelledBy(headingId)],
        [
          h.header(
            [h.Class("panel-tb")],
            [
              h.h2([h.Id(headingId)], [column.title]),
              h.span(
                [h.Class("meta")],
                [column.cards.length.toLocaleString(LOCALE)]
              ),
              ...info.toColumnActions(column),
            ]
          ),
          ...Array.match(items, {
            onEmpty: () => info.toEmptyView(column),
            onNonEmpty: (cards) => [
              h.ul([h.Role("list"), h.Class("board-cards")], cards),
            ],
          }),
        ]
      ),
    ]
  );
};

const liftedCopyView = (
  info: PlaceInfo,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { model } = info;

  const maybeLifted = Option.all({
    style: UiDragAndDrop.ghostStyle(model.dragAndDrop),
    held: model.maybeHeld,
    pressPoint: Option.flatMap(model.maybeHeld, (held) => held.maybePressPoint),
  });

  return Array.fromOption(
    Option.map(maybeLifted, ({ style, held, pressPoint }) =>
      h.div(
        [
          h.Class("board-lift"),
          h.Style(style),
          h.AriaHidden(true),
          h.OnMount(
            SizeLiftedCard({
              cardHook: cardHook(model, held.card.id),
              pressX: pressPoint.clientX,
              pressY: pressPoint.clientY,
            })
          ),
        ],
        [info.toCardView(held.card, liftedRender(h))]
      )
    )
  );
};

/**
 * Columns of printed slips, one panel per column (one column on narrow screens), built on
 * `@foldkit/ui`'s DragAndDrop: `div.board` of `div.board-col`, each a `section.panel` titled
 * by its column and holding `ul.board-cards`. The cards are the parent's; each renders
 * through `toCardView`, usually with `cardView`.
 *
 * A press on a card's body reports `SelectedCard`. While cards may move, a mouse drags a slip
 * (a press that moves under 5px stays a click), and touch and the keyboard take its grip:
 * Space or Enter picks the card up, every arrow jumps it one column in reading order, Space
 * drops it at the top of that column and Escape puts it back. A press on a control inside a
 * card does neither. The held card dims in place, a lifted copy follows the pointer, the
 * receiving column is outlined, and each step is said through the page's live region. A drop
 * reports `Moved`; lift `subscriptions(keyPrefix)` into the application's, or nothing
 * follows the pointer or the keys.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      columns,
      toCardView,
      toEmptyView = () => [],
      toColumnActions = () => [],
    } = viewInputs;

    const info: PlaceInfo = {
      model,
      columns,
      toCardView,
      toEmptyView,
      toColumnActions,
    };

    return h.div(
      [h.Class("board"), h.Style({ "--cols": `${columns.length}` })],
      [
        ...Array.map(columns, (column) => columnView(info, column, h)),
        ...(model.isMovable
          ? [
              h.p(
                [h.Id(gripHelpId(model)), h.Class("sr-only")],
                [COPY.gripHelp]
              ),
            ]
          : []),
        ...liftedCopyView(info, h),
      ]
    );
  }
);
