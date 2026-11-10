import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import { Announcer, Board } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, boardColumns, init, update } from "./move.ts";
import type { Model } from "./move.ts";

const resolveAnnounceMove = Story.Command.resolve(
  Board.AnnounceMove,
  Board.Message.CompletedAnnounceMove()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  Message.GotBoardMessage({
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
        containerId: `task-board/${column}`,
        index,
      }),
    })
  );

const statusOf = (model: Model, taskId: string) =>
  Option.map(
    Array.findFirst(model.tasks, ({ id }) => id === taskId),
    ({ status }) => status
  );

describe("the move example", () => {
  it("drops a card between two in another column, taking that column's status", () => {
    const start = init().model;

    Story.story(
      update,
      Story.given(start),
      Story.message(
        Message.GotBoardMessage({
          message: Board.Message.PressedCard({
            cardId: "deck",
            spot: "Body",
            pointerType: "mouse",
            screenX: 100,
            screenY: 100,
            lift: { width: 240, offsetX: -12, offsetY: -8 },
            columnsAtPress: boardColumns(start),
          }),
        })
      ),
      Story.message(pointerAt(140, "Doing", 0)),
      resolveAnnounceMove,
      Story.message(pointerAt(160, "Todo", 1)),
      resolveAnnounceMove,
      Story.message(gotDragAndDrop(UiDragAndDrop.Message.ReleasedPointer())),
      Story.Command.expectHas(Announcer.Flash({ selector: "#task-card-deck" })),
      Story.Command.resolve(Announcer.Flash, Message.CompletedFlash()),
      resolveAnnounceMove,
      Story.model((model) => {
        expect(Array.map(model.tasks, ({ id }) => id)).toStrictEqual([
          "sink",
          "deck",
          "taxes",
          "tyres",
        ]);
        expect(statusOf(model, "deck")).toStrictEqual(Option.some("Todo"));
      })
    );
  });
});
