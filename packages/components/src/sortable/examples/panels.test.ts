import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Sortable } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./panels.ts";

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
});
