import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Option } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { isHolding } from "../drag/drag.ts";
import * as Panel from "../panel/panel.ts";
import * as Sortable from "./sortable.ts";

const ITEMS: readonly Sortable.Item[] = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
];

const hook = (itemId: string): string => `order/${itemId}`;

const Got = (message: UiDragAndDrop.Message) =>
  Sortable.Message.GotDragAndDropMessage({ message });

const arrow = (direction: "Down" | "Up" | "Left" | "Right") =>
  Got(UiDragAndDrop.Message.PressedArrowKey({ direction }));

const resolveMove = (
  direction: "Down" | "Up" | "Left" | "Right",
  currentIndex: number,
  targetIndex: number
) =>
  Story.Command.resolve(
    UiDragAndDrop.ResolveKeyboardMove({
      itemId: hook("beta"),
      currentContainerId: "order",
      currentIndex,
      direction,
    }),
    UiDragAndDrop.Message.CompletedResolveKeyboardMove({
      targetContainerId: "order",
      targetIndex,
    })
  );

const resolveFocus = (itemId: string) =>
  Story.Command.resolve(
    UiDragAndDrop.FocusItem({ itemId: hook(itemId) }),
    UiDragAndDrop.Message.CompletedFocusItem()
  );

const resolveAnnounce = (text: string) =>
  Story.Command.resolve(
    Sortable.AnnounceReorder({ text }),
    Sortable.Message.CompletedAnnounceReorder()
  );

const pressItem = (itemId: string) =>
  Sortable.Message.PressedItem({
    itemId,
    pointerId: 1,
    screenX: 100,
    screenY: 100,
    clientX: 100,
    clientY: 100,
    items: ITEMS,
  });

const pointerAt = (y: number, maybeIndex: Option.Option<number>) =>
  Sortable.Message.MovedPointer({
    screenX: 100,
    screenY: y,
    clientX: 100,
    clientY: y,
    maybeIndex,
  });

const releaseAt = (y: number, maybeIndex: Option.Option<number>) =>
  Sortable.Message.ReleasedPointer({
    screenX: 100,
    screenY: y,
    clientX: 100,
    clientY: y,
    maybeIndex,
  });

const fresh = Sortable.init({ id: "order" });

const KEYBOARD_PICK_UP =
  "Picked up Beta, 2 of 3. Arrow keys move it one place, space drops it, escape cancels.";

describe("Sortable update", () => {
  it("picks an item up by its grip, moves it a place per arrow and drops it there", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(
        Sortable.Message.PressedGripKey({ itemId: "beta", items: ITEMS })
      ),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(arrow("Down")),
      resolveMove("Down", 1, 2),
      resolveFocus("beta"),
      resolveAnnounce("Beta, 3 of 3."),
      Story.message(Got(UiDragAndDrop.Message.ConfirmedKeyboardDrop())),
      Story.expectOutMessage(
        Sortable.OutMessage.Moved({
          itemId: "beta",
          fromIndex: 1,
          toIndex: 2,
          maybeAfterItemId: Option.some("gamma"),
          maybeBeforeItemId: Option.none(),
        })
      ),
      resolveFocus("beta"),
      resolveAnnounce("Beta dropped at 3 of 3."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
        expect(model.maybeHeld).toStrictEqual(Option.none());
      })
    );
  });

  it("stays in the list on Tab", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(
        Sortable.Message.PressedGripKey({ itemId: "beta", items: ITEMS })
      ),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(
        Got(
          UiDragAndDrop.Message.PressedArrowKey({ direction: "NextContainer" })
        )
      ),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(UiDragAndDrop.maybeDropTarget(model.dragAndDrop)).toStrictEqual(
          Option.some({ containerId: "order", index: 1 })
        );
      })
    );
  });

  it("puts a keyboard-held item back on Escape and says the move was cancelled", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(
        Sortable.Message.PressedGripKey({ itemId: "beta", items: ITEMS })
      ),
      resolveAnnounce(KEYBOARD_PICK_UP),
      Story.message(Sortable.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      resolveFocus("beta"),
      resolveAnnounce("Move cancelled. Beta put back where it was."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("drops a pointer-held item where the pointer counts it among the others", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(pressItem("alpha")),
      Story.message(pointerAt(160, Option.some(1))),
      resolveAnnounce("Picked up Alpha."),
      Story.message(pointerAt(220, Option.some(2))),
      Story.message(releaseAt(220, Option.some(2))),
      Story.expectOutMessage(
        Sortable.OutMessage.Moved({
          itemId: "alpha",
          fromIndex: 0,
          toIndex: 2,
          maybeAfterItemId: Option.some("gamma"),
          maybeBeforeItemId: Option.none(),
        })
      ),
      resolveAnnounce("Alpha dropped at 3 of 3.")
    );
  });

  it("reports nothing for a drop where the item was, or outside the list", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(pressItem("alpha")),
      Story.message(pointerAt(160, Option.some(0))),
      resolveAnnounce("Picked up Alpha."),
      Story.message(releaseAt(160, Option.some(0))),
      Story.expectNoOutMessage(),
      resolveAnnounce("Alpha put back where it was."),
      Story.message(pressItem("alpha")),
      Story.message(pointerAt(160, Option.none())),
      resolveAnnounce("Picked up Alpha."),
      Story.message(releaseAt(160, Option.none())),
      Story.expectNoOutMessage(),
      resolveAnnounce("Alpha put back where it was.")
    );
  });

  it("drops where the pointer is let go, not where it last moved", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(pressItem("alpha")),
      Story.message(pointerAt(220, Option.some(2))),
      resolveAnnounce("Picked up Alpha."),
      Story.message(releaseAt(220, Option.none())),
      Story.expectNoOutMessage(),
      resolveAnnounce("Alpha put back where it was.")
    );
  });

  it("puts the item back when the browser cancels the pointer", () => {
    Story.story(
      Sortable.update,
      Story.given(fresh),
      Story.message(pressItem("alpha")),
      Story.message(pointerAt(220, Option.some(2))),
      resolveAnnounce("Picked up Alpha."),
      Story.message(Sortable.Message.CancelledPointer()),
      Story.expectNoOutMessage(),
      resolveAnnounce("Alpha put back where it was."),
      Story.model((model) => {
        expect(Option.isNone(model.maybeHeld)).toBe(true);
      })
    );
  });
});

const listView =
  (items: readonly Sortable.Item[]) =>
  (model: Sortable.Model, h: HtmlBuilder<Sortable.Message>) =>
    Sortable.view(
      model,
      {
        items,
        label: "Targets in order",
        toItemView: (item, render) => [
          h.span(render.isLifted ? [] : [h.Id(`name-${item.id}`)], [
            item.label,
          ]),
        ],
      },
      h
    );

const panelsView =
  (items: readonly Sortable.Item[], isReadOnly = false) =>
  (model: Sortable.Model, h: HtmlBuilder<Sortable.Message>) =>
    Sortable.view(
      model,
      {
        items,
        label: "Targets in order",
        layout: "Panels",
        isReadOnly,
        toItemView: (item, render) => [
          Panel.view(
            {
              id: render.isLifted
                ? `panel-${item.id}-lifted`
                : `panel-${item.id}`,
              title: item.label,
              lead: [render.grip],
              body: [item.label],
            },
            h
          ),
        ],
      },
      h
    );

const sizeLifted = Scene.Mount.resolve(
  Sortable.SizeLiftedItem,
  Sortable.Message.CompletedSizeLiftedItem()
);

describe("Sortable view", () => {
  it("names the list, and gives each item a grip named for it that says how it moves", () => {
    Scene.scene(
      { update: Sortable.update, view: listView(ITEMS) },
      Scene.given(fresh),
      Scene.expect(Scene.role("list", { name: "Targets in order" })).toHaveAttr(
        "role",
        "list"
      ),
      Scene.expectAll(Scene.all.role("listitem")).toHaveCount(3),
      Scene.expect(Scene.role("button", { name: "Move Beta" })).toHaveAttr(
        "aria-roledescription",
        "draggable"
      ),
      Scene.expect(Scene.role("button", { name: "Move Beta" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.expect(Scene.role("button", { name: "Move Beta" })).toHaveAttr(
        "aria-describedby",
        "order-grip-help"
      ),
      Scene.expect(Scene.selector("#order-grip-help")).toContainText(
        "Arrow keys move it one place"
      ),
      Scene.expect(Scene.role("listbox")).toBeAbsent()
    );
  });

  it("prints the held item's copy where the keyboard would drop it, uncounted", () => {
    const held = Sortable.update(
      fresh,
      Sortable.Message.PressedGripKey({ itemId: "alpha", items: ITEMS })
    ).model;

    const moved = Sortable.update(
      held,
      Got(
        UiDragAndDrop.Message.CompletedResolveKeyboardMove({
          targetContainerId: "order",
          targetIndex: 1,
        })
      )
    ).model;

    Scene.scene(
      { update: Sortable.update, view: listView(ITEMS) },
      Scene.given(moved),
      Scene.expect(Scene.role("button", { name: "Move Alpha" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(Scene.selector(".sortable-item.drag-dim")).toContainText(
        "Alpha"
      ),
      Scene.expect(Scene.selector(".sortable-slot")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".sortable-slot .lifted")).toContainText(
        "Alpha"
      ),
      Scene.expect(
        Scene.nth(Scene.all.selector(".sortable-items li"), 2)
      ).toHaveClass("sortable-slot"),
      Scene.expectAll(Scene.all.selector("[data-sortable-id]")).toHaveCount(3),
      Scene.expectAll(Scene.all.selector("#name-alpha")).toHaveCount(1)
    );
  });

  it("marks where a pointer would drop the held item, and nothing where it was", () => {
    const pressed = Sortable.update(fresh, pressItem("alpha")).model;

    const overGamma = Sortable.update(
      pressed,
      pointerAt(220, Option.some(1))
    ).model;

    const pastTheEnd = Sortable.update(
      pressed,
      pointerAt(300, Option.some(2))
    ).model;

    const whereItWas = Sortable.update(
      pressed,
      pointerAt(160, Option.some(0))
    ).model;

    Scene.scene(
      { update: Sortable.update, view: listView(ITEMS) },
      Scene.given(overGamma),
      sizeLifted,
      Scene.expect(Scene.selector(".drop-before")).toContainText("Gamma"),
      Scene.expect(Scene.selector(".sortable-lift .lifted")).toContainText(
        "Alpha"
      )
    );
    Scene.scene(
      { update: Sortable.update, view: listView(ITEMS) },
      Scene.given(pastTheEnd),
      sizeLifted,
      Scene.expect(Scene.selector(".drop-after")).toContainText("Gamma")
    );
    Scene.scene(
      { update: Sortable.update, view: listView(ITEMS) },
      Scene.given(whereItWas),
      sizeLifted,
      Scene.expect(Scene.selector(".drop-before")).toBeAbsent(),
      Scene.expect(Scene.selector(".drop-after")).toBeAbsent()
    );
  });
});

describe("Sortable panels", () => {
  it("hands each panel its grip for its title bar, and prints none beside it", () => {
    Scene.scene(
      { update: Sortable.update, view: panelsView(ITEMS) },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".sortable")).toHaveClass("panels"),
      Scene.expectAll(Scene.all.role("listitem")).toHaveCount(3),
      Scene.expect(
        Scene.selector("#panel-beta .panel-lead [data-sortable-grip]")
      ).toHaveAttr("aria-label", "Move Beta"),
      Scene.expectAll(Scene.all.selector("[data-sortable-grip]")).toHaveCount(
        3
      ),
      Scene.expect(Scene.selector(".sortable-item")).toHaveClass("movable")
    );
  });

  it("prints the held panel's copy where the keyboard would drop it, under its own ids", () => {
    const held = Sortable.update(
      fresh,
      Sortable.Message.PressedGripKey({ itemId: "alpha", items: ITEMS })
    ).model;

    Scene.scene(
      { update: Sortable.update, view: panelsView(ITEMS) },
      Scene.given(held),
      Scene.expect(
        Scene.selector(".sortable-slot .lifted #panel-alpha-lifted")
      ).toExist(),
      Scene.expect(
        Scene.selector(".sortable-slot [data-sortable-grip]")
      ).toBeAbsent(),
      Scene.expectAll(Scene.all.selector("#panel-alpha")).toHaveCount(1)
    );
  });

  it("holds every grip and lifts nothing for a reader who may not reorder", () => {
    Scene.scene(
      { update: Sortable.update, view: panelsView(ITEMS, true) },
      Scene.given(fresh),
      Scene.expect(Scene.role("button", { name: "Move Beta" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(
        Scene.role("button", { name: "Move Beta" })
      ).not.toHaveHandler("keydown"),
      Scene.expect(Scene.selector(".sortable-item")).not.toHaveClass("movable"),
      Scene.expect(
        Scene.role("button", { name: "Move Beta" })
      ).not.toHaveHandler("pointerdown")
    );
  });
});

const holdingView = (model: Sortable.Model, h: HtmlBuilder<Sortable.Message>) =>
  h.div(
    [],
    [
      listView(ITEMS)(model, h),
      h.output([h.Class("holding")], [isHolding(model) ? "holding" : "free"]),
    ]
  );

describe("Sortable press", () => {
  it("lifts nothing for a press on an item's body, so its text selects, and lifts by the grip", () => {
    Scene.scene(
      { update: Sortable.update, view: holdingView },
      Scene.given(fresh),
      Scene.expect(Scene.selector("#name-beta")).not.toHaveHandler(
        "pointerdown"
      ),
      Scene.expect(Scene.selector(".sortable-item")).not.toHaveHandler(
        "pointerdown"
      ),
      Scene.pointerDown(Scene.role("button", { name: "Move Beta" }), {
        pointerType: "touch",
      }),
      Scene.expect(Scene.selector(".holding")).toHaveText("holding")
    );
  });
});
