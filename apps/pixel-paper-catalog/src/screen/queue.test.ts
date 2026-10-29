import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Board } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as QueueScreen from "./queue.ts";

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  QueueScreen.Message.CompletedAnnounce()
);

const resolveAnnounceMove = Story.Command.resolve(
  Board.AnnounceMove,
  Board.Message.CompletedAnnounceMove()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  QueueScreen.Message.GotBoardMessage({
    message: Board.Message.GotDragAndDropMessage({ message }),
  });

const pointerAt = (x: number, column: string, index: number) =>
  gotDragAndDrop(
    UiDragAndDrop.Message.MovedPointer({
      screenX: x,
      screenY: 100,
      clientX: x,
      clientY: 100,
      maybeDropTarget: Option.some({
        containerId: `queue-board/${column}`,
        index,
      }),
    })
  );

describe("Queue screen", () => {
  it("filters by mark and by words, and clears both at once", () => {
    Story.story(
      QueueScreen.update,
      Story.given(QueueScreen.init()),
      Story.message(QueueScreen.Message.ToggledMarkedOnly()),
      Story.message(QueueScreen.Message.UpdatedQuery({ value: "backups" })),
      Story.model((model) => {
        expect(model.isMarkedOnly).toBe(true);
        expect(model.query).toBe("backups");
      }),
      Story.message(QueueScreen.Message.ClickedClearFilter()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.isMarkedOnly).toBe(false);
        expect(model.query).toBe("");
      })
    );
  });

  it("folds and unfolds a group, and switches the layout", () => {
    Story.story(
      QueueScreen.update,
      Story.given(QueueScreen.init()),
      Story.message(QueueScreen.Message.ToggledGroup({ groupId: "ops" })),
      Story.message(QueueScreen.Message.SelectedLayout({ layout: "Board" })),
      Story.model((model) => {
        expect(model.foldedGroupIds).toStrictEqual(["ops"]);
        expect(model.layout).toBe("Board");
      }),
      Story.message(QueueScreen.Message.ToggledGroup({ groupId: "ops" })),
      Story.model((model) => {
        expect(model.foldedGroupIds).toStrictEqual([]);
      })
    );
  });

  it("says that a new item, by button or key, and an opened item are samples", () => {
    Story.story(
      QueueScreen.update,
      Story.given(QueueScreen.init()),
      Story.message(QueueScreen.Message.ClickedNewItem()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "New item (sample): nothing was made." })
      ),
      resolveAnnounce,
      Story.message(QueueScreen.Message.PressedNewItemKey()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "New item (sample): nothing was made." })
      ),
      resolveAnnounce,
      Story.message(
        QueueScreen.Message.ClickedItem({ title: "Book the boiler service" })
      ),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Opened Book the boiler service (sample)." })
      ),
      resolveAnnounce,
      Story.model((model) => {
        expect(model).toStrictEqual(QueueScreen.init());
      })
    );
  });

  it("gives an item dropped in another column that column's status, and flashes its card", () => {
    Story.story(
      QueueScreen.update,
      Story.given(QueueScreen.init()),
      Story.message(
        QueueScreen.Message.GotBoardMessage({
          message: Board.Message.PressedCard({
            cardId: "i1",
            spot: "Body",
            pointerType: "mouse",
            screenX: 100,
            screenY: 100,
            clientX: 100,
            clientY: 100,
            columnsAtPress: QueueScreen.boardColumns(QueueScreen.init()),
          }),
        })
      ),
      Story.message(pointerAt(140, "Active", 0)),
      resolveAnnounceMove,
      Story.message(pointerAt(160, "Done", 0)),
      resolveAnnounceMove,
      Story.message(gotDragAndDrop(UiDragAndDrop.Message.ReleasedPointer())),
      Story.Command.expectHas(Announcer.Flash({ selector: "#queue-card-i1" })),
      Story.Command.resolve(
        Announcer.Flash,
        QueueScreen.Message.CompletedFlash()
      ),
      resolveAnnounceMove,
      Story.model((model) => {
        expect(
          Option.map(
            Array.findFirst(model.items, ({ id }) => id === "i1"),
            ({ status }) => status
          )
        ).toStrictEqual(Option.some("Done"));
      })
    );
  });
});
