import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Sortable } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Scene, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update, view } from "./panels.ts";

const resolveAnnounceReorder = Story.Command.resolve(
  Sortable.AnnounceReorder,
  Sortable.Message.CompletedAnnounceReorder()
);

const resolveFocusItem = Story.Command.resolve(
  UiDragAndDrop.FocusItem,
  UiDragAndDrop.Message.CompletedFocusItem()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  Message.GotDeskMessage({
    message: Sortable.Message.GotDragAndDropMessage({ message }),
  });

describe("the panels example", () => {
  it("moves a panel where the keyboard dropped it and flashes it", () => {
    const start = init().model;

    Story.story(
      update,
      Story.given(start),
      Story.message(
        Message.GotDeskMessage({
          message: Sortable.Message.PressedGripKey({
            itemId: "inbox",
            items: Array.map(start.feeds, ({ id, label }) => ({ id, label })),
          }),
        })
      ),
      resolveAnnounceReorder,
      Story.message(
        gotDragAndDrop(
          UiDragAndDrop.Message.CompletedResolveKeyboardMove({
            targetContainerId: "feed-desk",
            targetIndex: 2,
          })
        )
      ),
      resolveFocusItem,
      resolveAnnounceReorder,
      Story.message(
        gotDragAndDrop(UiDragAndDrop.Message.ConfirmedKeyboardDrop())
      ),
      resolveFocusItem,
      resolveAnnounceReorder,
      Story.Command.resolve(
        Announcer.Flash({ selector: "#feed-inbox" }),
        Message.CompletedFlash()
      ),
      Story.model((model) => {
        expect(Array.map(model.feeds, ({ id }) => id)).toStrictEqual([
          "builds",
          "alerts",
          "inbox",
          "deploys",
        ]);
      })
    );
  });

  it("holds every grip while the desk is read only", () => {
    const grip = Scene.role("button", { name: "Move Inbox" });

    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(grip).not.toHaveAttr("aria-disabled"),
      Scene.click(Scene.role("button", { name: "read only" })),
      Scene.expect(Scene.role("button", { name: "read only" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(grip).toHaveAttr("aria-disabled", "true")
    );
  });
});
