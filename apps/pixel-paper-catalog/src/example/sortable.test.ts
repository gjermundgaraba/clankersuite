import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Sortable } from "@gjermundgaraba/pixel-paper";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as SortableExample from "./sortable.ts";

const items = (model: SortableExample.Model) =>
  Array.map(model.rows, ({ id, label }) => ({ id, label }));

describe("Sortable example", () => {
  it("moves a row where it was dropped and flashes it", () => {
    const start = SortableExample.init();

    Story.story(
      SortableExample.update,
      Story.given(start),
      Story.message(
        SortableExample.Message.GotOrderMessage({
          message: Sortable.Message.PressedGripKey({
            itemId: "max",
            items: items(start),
          }),
        })
      ),
      Story.Command.resolve(
        Sortable.AnnounceReorder,
        Sortable.Message.CompletedAnnounceReorder()
      ),
      Story.message(
        SortableExample.Message.GotOrderMessage({
          message: Sortable.Message.GotDragAndDropMessage({
            message: UiDragAndDrop.Message.CompletedResolveKeyboardMove({
              targetContainerId: "sample-order",
              targetIndex: 2,
            }),
          }),
        })
      ),
      Story.Command.resolve(
        UiDragAndDrop.FocusItem,
        UiDragAndDrop.Message.CompletedFocusItem()
      ),
      Story.Command.resolve(
        Sortable.AnnounceReorder,
        Sortable.Message.CompletedAnnounceReorder()
      ),
      Story.message(
        SortableExample.Message.GotOrderMessage({
          message: Sortable.Message.GotDragAndDropMessage({
            message: UiDragAndDrop.Message.ConfirmedKeyboardDrop(),
          }),
        })
      ),
      Story.Command.resolve(
        UiDragAndDrop.FocusItem,
        UiDragAndDrop.Message.CompletedFocusItem()
      ),
      Story.Command.resolve(
        Sortable.AnnounceReorder,
        Sortable.Message.CompletedAnnounceReorder()
      ),
      Story.Command.resolve(
        Announcer.Flash({ selector: "#order-max" }),
        SortableExample.Message.CompletedFlash()
      ),
      Story.model((model) => {
        expect(Array.map(model.rows, ({ id }) => id)).toStrictEqual([
          "team",
          "archive",
          "max",
          "trial",
        ]);
      })
    );
  });
});
