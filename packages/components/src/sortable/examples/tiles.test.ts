import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Sortable } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./tiles.ts";

const resolveAnnounceReorder = Story.Command.resolve(
  Sortable.AnnounceReorder,
  Sortable.Message.CompletedAnnounceReorder()
);

const resolveFocusItem = Story.Command.resolve(
  UiDragAndDrop.FocusItem,
  UiDragAndDrop.Message.CompletedFocusItem()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  Message.GotShelfMessage({
    message: Sortable.Message.GotDragAndDropMessage({ message }),
  });

describe("the tiles example", () => {
  it("moves a tile where the keyboard dropped it and flashes it", () => {
    const start = init().model;

    Story.story(
      update,
      Story.given(start),
      Story.message(
        Message.GotShelfMessage({
          message: Sortable.Message.PressedGripKey({
            itemId: "notes",
            items: Array.map(start.tools, ({ id, label }) => ({ id, label })),
          }),
        })
      ),
      resolveAnnounceReorder,
      Story.message(
        gotDragAndDrop(
          UiDragAndDrop.Message.CompletedResolveKeyboardMove({
            targetContainerId: "tool-shelf",
            targetIndex: 3,
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
        Announcer.Flash({ selector: "#tool-notes" }),
        Message.CompletedFlash()
      ),
      Story.model((model) => {
        expect(Array.map(model.tools, ({ id }) => id)).toStrictEqual([
          "tasks",
          "calendar",
          "files",
          "notes",
          "people",
        ]);
      })
    );
  });
});
