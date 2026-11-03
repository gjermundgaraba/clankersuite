import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Sortable } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./rows.ts";

const resolveAnnounceReorder = Story.Command.resolve(
  Sortable.AnnounceReorder,
  Sortable.Message.CompletedAnnounceReorder()
);

const resolveFocusItem = Story.Command.resolve(
  UiDragAndDrop.FocusItem,
  UiDragAndDrop.Message.CompletedFocusItem()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  Message.GotOrderMessage({
    message: Sortable.Message.GotDragAndDropMessage({ message }),
  });

describe("the rows example", () => {
  it("moves a row where the keyboard dropped it and flashes it", () => {
    const start = init().model;

    Story.story(
      update,
      Story.given(start),
      Story.message(
        Message.GotOrderMessage({
          message: Sortable.Message.PressedGripKey({
            itemId: "studio",
            items: Array.map(start.plans, ({ id, label }) => ({ id, label })),
          }),
        })
      ),
      resolveAnnounceReorder,
      Story.message(
        gotDragAndDrop(
          UiDragAndDrop.Message.CompletedResolveKeyboardMove({
            targetContainerId: "plan-order",
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
        Announcer.Flash({ selector: "#plan-studio" }),
        Message.CompletedFlash()
      ),
      Story.model((model) => {
        expect(Array.map(model.plans, ({ id }) => id)).toStrictEqual([
          "team",
          "archive",
          "studio",
          "trial",
        ]);
      })
    );
  });
});
