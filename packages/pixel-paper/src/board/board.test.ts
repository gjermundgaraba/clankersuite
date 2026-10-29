import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Option } from "effect";
import { Scene, Story, Subscription } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { isHolding } from "../drag/drag.ts";
import * as Board from "./board.ts";

const COLUMNS: readonly Board.Column[] = [
  {
    id: "todo",
    title: "To do",
    cards: [
      { id: "sink", label: "Fix the sink" },
      { id: "wash", label: "Do the washing" },
      { id: "iron", label: "Iron shirts" },
    ],
  },
  { id: "doing", title: "Doing", cards: [{ id: "tax", label: "File taxes" }] },
  { id: "done", title: "Done", cards: [] },
];

const hook = (localId: string): string => `work/${localId}`;

const Got = (message: UiDragAndDrop.Message) =>
  Board.Message.GotDragAndDropMessage({ message });

const pressGrip = Board.Message.PressedGripKey({
  cardId: "sink",
  columnsAtPress: COLUMNS,
});

const pressCard = (pointerType = "mouse", spot: "Body" | "Grip" = "Body") =>
  Board.Message.PressedCard({
    cardId: "sink",
    spot,
    pointerType,
    screenX: 100,
    screenY: 100,
    clientX: 100,
    clientY: 100,
    columnsAtPress: COLUMNS,
  });

const pointerAt = (
  x: number,
  maybeTarget: Option.Option<Readonly<{ column: string; index: number }>>
) =>
  Got(
    UiDragAndDrop.Message.MovedPointer({
      screenX: x,
      screenY: 100,
      clientX: x,
      clientY: 100,
      maybeDropTarget: Option.map(maybeTarget, ({ column, index }) => ({
        containerId: hook(column),
        index,
      })),
    })
  );

const arrow = (direction: "Down" | "Up" | "Left" | "Right") =>
  Got(UiDragAndDrop.Message.PressedArrowKey({ direction }));

const resolveMove = (
  from: string,
  direction: "NextContainer" | "PreviousContainer",
  to: string,
  currentIndex = 0
) =>
  Story.Command.resolve(
    UiDragAndDrop.ResolveKeyboardMove({
      itemId: hook("sink"),
      currentContainerId: hook(from),
      currentIndex,
      direction,
    }),
    UiDragAndDrop.Message.CompletedResolveKeyboardMove({
      targetContainerId: to,
      targetIndex: 0,
    })
  );

const resolveFocus = Story.Command.resolve(
  UiDragAndDrop.FocusItem({ itemId: hook("sink") }),
  UiDragAndDrop.Message.CompletedFocusItem()
);

const resolveAnnounce = (text: string) =>
  Story.Command.resolve(
    Board.AnnounceMove({ text }),
    Board.Message.CompletedAnnounceMove()
  );

const KEYBOARD_PICK_UP =
  "Picked up Fix the sink. Arrow keys move it to another column, space drops it, escape cancels.";

const fresh = Board.init({ id: "work" });

describe("Board update", () => {
  it("picks a card up by its grip, jumps it a column per arrow and drops it at the top", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressGrip),
      Story.model((model) => {
        expect(Board.isDragging(model)).toBe(true);
        expect(
          Option.map(model.maybeHeld, ({ card }) => card.id)
        ).toStrictEqual(Option.some("sink"));
      }),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(arrow("Down")),
      resolveMove("todo", "NextContainer", hook("doing")),
      resolveFocus,
      resolveAnnounce("Fix the sink is over Doing."),
      Story.message(Got(UiDragAndDrop.Message.ConfirmedKeyboardDrop())),
      Story.expectOutMessage(
        Board.OutMessage.Moved({
          cardId: "sink",
          fromColumnId: "todo",
          fromIndex: 0,
          toColumnId: "doing",
          toIndex: 0,
          maybeAfterCardId: Option.none(),
          maybeBeforeCardId: Option.some("tax"),
        })
      ),
      resolveFocus,
      resolveAnnounce("Fix the sink dropped in Doing."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
        expect(
          Option.map(model.maybeHeld, ({ card }) => card.id)
        ).toStrictEqual(Option.none());
      })
    );
  });

  it("does not step onto a column that belongs to another list", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressGrip),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(arrow("Left")),
      resolveMove("todo", "PreviousContainer", "inbox/later"),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(UiDragAndDrop.maybeDropTarget(model.dragAndDrop)).toStrictEqual(
          Option.some({ containerId: hook("todo"), index: 0 })
        );
      })
    );
  });

  it("puts a card carried back to its own column where it was, reporting no move", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressGrip),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(arrow("Right")),
      resolveMove("todo", "NextContainer", hook("doing")),
      resolveFocus,
      resolveAnnounce("Fix the sink is over Doing."),
      Story.message(arrow("Up")),
      resolveMove("doing", "PreviousContainer", hook("todo")),
      resolveFocus,
      resolveAnnounce("Fix the sink is over To do."),
      Story.message(Got(UiDragAndDrop.Message.ConfirmedKeyboardDrop())),
      Story.expectNoOutMessage(),
      resolveFocus,
      resolveAnnounce("Fix the sink put back where it was.")
    );
  });

  it("puts a card back on Escape, focus on its grip, and reports no move", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressGrip),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(Board.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      resolveFocus,
      resolveAnnounce("Move cancelled. Fix the sink put back where it was."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("follows a pointer past the threshold and reports where in the column it lands", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressCard()),
      Story.expectOutMessage(Board.OutMessage.SelectedCard({ cardId: "sink" })),
      Story.Command.expectNone(),
      Story.message(pointerAt(102, Option.some({ column: "todo", index: 0 }))),
      Story.Command.expectNone(),
      Story.message(pointerAt(140, Option.some({ column: "todo", index: 0 }))),
      resolveAnnounce("Picked up Fix the sink."),
      Story.message(pointerAt(400, Option.some({ column: "done", index: 0 }))),
      resolveAnnounce("Fix the sink is over Done."),
      Story.message(pointerAt(160, Option.some({ column: "todo", index: 2 }))),
      resolveAnnounce("Fix the sink is over To do."),
      Story.message(Got(UiDragAndDrop.Message.ReleasedPointer())),
      Story.expectOutMessage(
        Board.OutMessage.Moved({
          cardId: "sink",
          fromColumnId: "todo",
          fromIndex: 0,
          toColumnId: "todo",
          toIndex: 1,
          maybeAfterCardId: Option.some("wash"),
          maybeBeforeCardId: Option.some("iron"),
        })
      ),
      resolveAnnounce("Fix the sink dropped in To do.")
    );
  });

  it("says a card let go over no column, or where it was, was put back", () => {
    const carried = Story.steps(
      Story.message(pressCard()),
      Story.message(pointerAt(140, Option.some({ column: "todo", index: 1 }))),
      resolveAnnounce("Picked up Fix the sink.")
    );

    Story.story(
      Board.update,
      Story.given(fresh),
      carried,
      Story.message(Got(UiDragAndDrop.Message.ReleasedPointer())),
      Story.expectNoOutMessage(),
      resolveAnnounce("Fix the sink put back where it was."),
      carried,
      Story.message(pointerAt(500, Option.none())),
      Story.message(Got(UiDragAndDrop.Message.ReleasedPointer())),
      Story.expectNoOutMessage(),
      resolveAnnounce("Fix the sink put back where it was.")
    );
  });

  it("lets Escape drop a press that never moved, saying nothing", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressCard()),
      Story.message(Board.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("lets a press that never moved stay a click, saying nothing", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressCard()),
      Story.message(Got(UiDragAndDrop.Message.ReleasedPointer())),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("selects on a touch of the card's body but lifts only from the grip", () => {
    Story.story(
      Board.update,
      Story.given(fresh),
      Story.message(pressCard("touch")),
      Story.expectOutMessage(Board.OutMessage.SelectedCard({ cardId: "sink" })),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      }),
      Story.message(pressCard("touch", "Grip")),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(isHolding(model)).toBe(true);
      })
    );
  });
});

const lift = (keyPrefix: string) =>
  Subscription.lift(Board.subscriptions(keyPrefix))<Board.Model, Board.Message>(
    {
      read: Option.some,
      toParentMessage: (message) => message,
    }
  );

describe("Board subscriptions", () => {
  it("are keyed by the parent's prefix, so two boards aggregate side by side", () => {
    expect(
      Object.keys(Board.subscriptions("queueBoard")).toSorted()
    ).toStrictEqual([
      "queueBoardAutoScroll",
      "queueBoardEscape",
      "queueBoardKeyboard",
      "queueBoardPointer",
    ]);
    expect(
      Object.keys(Subscription.aggregate(lift("first"), lift("second")))
    ).toHaveLength(8);
  });
});

const itemCardView =
  (h: HtmlBuilder<Board.Message>) =>
  (card: Board.Card, render: Board.CardRender) =>
    Board.cardView(
      {
        render,
        title: card.label,
        onOpen: Board.Message.CompletedAnnounceMove(),
        meta: [
          h.span([h.Class("age")], ["2d"]),
          h.button([h.Type("button"), h.Class("tool")], ["snooze"]),
          h.span([h.DataAttribute("no-lift", "")], ["note"]),
        ],
        attributes: [h.AriaCurrent(card.id === "sink" ? "true" : "false")],
      },
      h
    );

const boardView = (model: Board.Model, h: HtmlBuilder<Board.Message>) =>
  Board.view(
    model,
    {
      columns: COLUMNS,
      toCardView: itemCardView(h),
      toEmptyView: () => [h.p([h.Class("empty")], ["Nothing here."])],
    },
    h
  );

const editingView = (model: Board.Model, h: HtmlBuilder<Board.Message>) =>
  Board.view(
    model,
    {
      columns: COLUMNS,
      toCardView: (card, render) =>
        Board.cardView(
          {
            render,
            title: card.label,
            onOpen: Board.Message.CompletedAnnounceMove(),
            editor:
              card.id === "sink"
                ? [
                    h.input([
                      h.AriaLabel("Rename Fix the sink"),
                      h.Value(card.label),
                    ]),
                  ]
                : [],
          },
          h
        ),
    },
    h
  );

const grip = Scene.role("button", { name: "Move Fix the sink" });
const sinkCard = Scene.selector('li[data-sortable-id="work/sink"] article');

const keyboardHeld = [
  Scene.keydown(grip, " "),
  Scene.Command.resolve(
    Board.AnnounceMove,
    Board.Message.CompletedAnnounceMove()
  ),
] as const;

describe("Board view", () => {
  it("prints each column as a panel named by its title, with a count", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".board")).toHaveStyle("--cols", "3"),
      Scene.expect(Scene.role("region", { name: "Doing" })).toContainText(
        "File taxes"
      ),
      Scene.expect(Scene.role("region", { name: "Done" })).toContainText(
        "Nothing here."
      ),
      Scene.expect(
        Scene.selector('[data-droppable-id="work/todo"]')
      ).toHaveClass("board-col"),
      Scene.expect(sinkCard).toHaveClass("movable")
    );
  });

  it("names each grip for its card, as a draggable that describes its keys, with a tip", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.expect(grip).toHaveAttr("data-board-grip", ""),
      Scene.expect(grip).toHaveAttr("data-tip", "Move Fix the sink"),
      Scene.expect(grip).toHaveAttr("aria-roledescription", "draggable"),
      Scene.expect(grip).toHaveAttr("aria-pressed", "false"),
      Scene.expect(grip).toHaveAttr("data-draggable-id", "work/sink"),
      Scene.expect(grip).toHaveAccessibleDescription(
        "Press space to pick the card up. Arrow keys move it to another column, space drops it, escape cancels."
      )
    );
  });

  it("keeps the caller's attributes", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.expect(sinkCard).toHaveAttr("aria-current", "true")
    );
  });

  it("shows a card's editor in its title's place, and the title on the copy it lifts", () => {
    Scene.scene(
      { update: Board.update, view: editingView },
      Scene.given(fresh),
      Scene.expect(
        Scene.role("textbox", { name: "Rename Fix the sink" })
      ).toExist(),
      Scene.expect(Scene.role("button", { name: "Fix the sink" })).toBeAbsent(),
      Scene.expect(Scene.role("button", { name: "Do the washing" })).toExist(),
      ...keyboardHeld,
      Scene.Subscription.emit(arrow("Right")),
      Scene.Command.resolve(
        UiDragAndDrop.ResolveKeyboardMove,
        UiDragAndDrop.Message.CompletedResolveKeyboardMove({
          targetContainerId: hook("doing"),
          targetIndex: 0,
        })
      ),
      Scene.Command.resolveAll(
        [UiDragAndDrop.FocusItem, UiDragAndDrop.Message.CompletedFocusItem()],
        [Board.AnnounceMove, Board.Message.CompletedAnnounceMove()]
      ),
      Scene.expect(
        Scene.selector(".board-lift-slot article .title")
      ).toHaveText("Fix the sink"),
      Scene.expect(Scene.selector(".board-lift-slot input")).toBeAbsent()
    );
  });

  it("picks the card up on Space at its grip, pressed, and lifts a copy into the target", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      ...keyboardHeld,
      Scene.expect(grip).toHaveAttr("aria-pressed", "true"),
      Scene.expect(sinkCard).toHaveClass("drag-dim"),
      Scene.expect(
        Scene.selector('[data-droppable-id="work/todo"]')
      ).toHaveClass("drop-target"),
      Scene.Subscription.emit(arrow("Right")),
      Scene.Command.resolve(
        UiDragAndDrop.ResolveKeyboardMove,
        UiDragAndDrop.Message.CompletedResolveKeyboardMove({
          targetContainerId: hook("doing"),
          targetIndex: 0,
        })
      ),
      Scene.Command.resolveAll(
        [UiDragAndDrop.FocusItem, UiDragAndDrop.Message.CompletedFocusItem()],
        [Board.AnnounceMove, Board.Message.CompletedAnnounceMove()]
      ),
      Scene.expect(
        Scene.selector('[data-droppable-id="work/doing"]')
      ).toHaveClass("drop-target"),
      Scene.expect(
        Scene.selector('[data-droppable-id="work/todo"]')
      ).not.toHaveClass("drop-target"),
      Scene.expect(Scene.selector(".board-lift-slot")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".board-lift-slot article")).toHaveClass(
        "lifted"
      ),
      Scene.expect(Scene.selector(".board-lift-slot article")).not.toHaveAttr(
        "aria-current"
      )
    );
  });

  it("picks the card up on Enter at its grip", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.keydown(grip, "Enter"),
      Scene.Command.resolve(
        Board.AnnounceMove({ text: KEYBOARD_PICK_UP }),
        Board.Message.CompletedAnnounceMove()
      ),
      Scene.expect(grip).toHaveAttr("aria-pressed", "true")
    );
  });

  it("lifts a copy that follows a mouse once the press has moved", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.pointerDown(sinkCard, {
        pointerType: "mouse",
        screenX: 100,
        screenY: 100,
        clientX: 100,
        clientY: 100,
      }),
      Scene.expectOutMessage(Board.OutMessage.SelectedCard({ cardId: "sink" })),
      Scene.expect(Scene.selector(".board-lift")).toBeAbsent(),
      Scene.Subscription.emit(
        pointerAt(160, Option.some({ column: "done", index: 0 }))
      ),
      Scene.Command.resolve(
        Board.AnnounceMove,
        Board.Message.CompletedAnnounceMove()
      ),
      Scene.Mount.resolve(
        Board.SizeLiftedCard,
        Board.Message.CompletedSizeLiftedCard()
      ),
      Scene.expect(Scene.selector(".board-lift")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".board-lift article")).toHaveClass("lifted"),
      Scene.expect(
        Scene.selector('[data-droppable-id="work/done"]')
      ).toHaveClass("drop-target")
    );
  });

  it("leaves a touch on the slip to scroll the page; a touch on the grip lifts the card", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.pointerDown(sinkCard, { pointerType: "touch" }),
      Scene.expectOutMessage(Board.OutMessage.SelectedCard({ cardId: "sink" })),
      Scene.Subscription.emit(
        pointerAt(160, Option.some({ column: "done", index: 0 }))
      ),
      Scene.expect(Scene.selector(".board-card.drag-dim")).toBeAbsent(),
      Scene.pointerDown(grip, {
        pointerType: "touch",
        screenX: 100,
        screenY: 100,
      }),
      Scene.expectNoOutMessage(),
      Scene.Subscription.emit(
        pointerAt(160, Option.some({ column: "done", index: 0 }))
      ),
      Scene.Command.resolve(
        Board.AnnounceMove,
        Board.Message.CompletedAnnounceMove()
      ),
      Scene.Mount.resolve(
        Board.SizeLiftedCard,
        Board.Message.CompletedSizeLiftedCard()
      ),
      Scene.expect(sinkCard).toHaveClass("drag-dim")
    );
  });

  it("neither selects nor lifts a card pressed on a control inside it", () => {
    Scene.scene(
      { update: Board.update, view: boardView },
      Scene.given(fresh),
      Scene.pointerDown(Scene.role("button", { name: "snooze" }), {
        pointerType: "mouse",
      }),
      Scene.expectIgnored(),
      Scene.pointerDown(
        Scene.selector('li[data-sortable-id="work/sink"] [data-no-lift]'),
        {
          pointerType: "mouse",
        }
      ),
      Scene.expectIgnored(),
      Scene.expect(Scene.selector(".board-card.drag-dim")).toBeAbsent()
    );
  });
});
