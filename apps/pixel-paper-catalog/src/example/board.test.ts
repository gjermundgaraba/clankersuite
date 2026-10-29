import { DragAndDrop as UiDragAndDrop } from "@foldkit/ui";
import {
  Announcer,
  Board,
  Focus,
  InlineInput,
} from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as BoardExample from "./board.ts";

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  BoardExample.Message.CompletedAnnounce()
);

const resolveAnnounceMove = Story.Command.resolve(
  Board.AnnounceMove,
  Board.Message.CompletedAnnounceMove()
);

const gotDragAndDrop = (message: UiDragAndDrop.Message) =>
  BoardExample.Message.GotBoardMessage({
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
        containerId: `sample-board/${column}`,
        index,
      }),
    })
  );

const renaming = (message: InlineInput.Message) =>
  BoardExample.Message.GotRenameMessage({ message });

const renameTo = (text: string) =>
  Story.steps(
    Story.message(BoardExample.Message.ClickedRename({ itemId: "sink" })),
    Story.Command.resolve(
      InlineInput.FocusField,
      InlineInput.Message.CompletedFocusField()
    ),
    Story.message(
      renaming(
        InlineInput.Message.UpdatedDraft({
          value: text,
          replaced: "Fix the kitchen sink",
        })
      )
    ),
    Story.message(renaming(InlineInput.Message.PressedEnter())),
    Story.Command.expectExact(
      BoardExample.SaveRename({ itemId: "sink", text })
    ),
    Story.Command.resolve(
      BoardExample.SaveRename,
      BoardExample.Message.CompletedSaveRename({ itemId: "sink", text })
    )
  );

const sinkTitle = (model: BoardExample.Model): Option.Option<string> =>
  Option.map(
    Array.findFirst(model.items, ({ id }) => id === "sink"),
    ({ title }) => title
  );

describe("Board example", () => {
  it("says what a card and an area would do", () => {
    Story.story(
      BoardExample.update,
      Story.given(BoardExample.init()),
      Story.message(
        BoardExample.Message.ClickedItem({ title: "Fix the kitchen sink" })
      ),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Opened Fix the kitchen sink (sample)." })
      ),
      resolveAnnounce,
      Story.message(BoardExample.Message.ClickedArea({ area: "Home" })),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Showing Home (sample)." })
      ),
      resolveAnnounce
    );
  });

  it("renames a card in place, then puts focus back on its pencil", () => {
    Story.story(
      BoardExample.update,
      Story.given(BoardExample.init()),
      renameTo("Fix the bathroom sink"),
      Story.Command.expectExact(Focus.Focus({ id: "sample-rename-sink" })),
      Story.Command.resolve(Focus.Focus, BoardExample.Message.CompletedFocus()),
      Story.model((model) => {
        expect(sinkTitle(model)).toStrictEqual(
          Option.some("Fix the bathroom sink")
        );
        expect(model.maybeRenaming).toStrictEqual(Option.none());
      })
    );
  });

  it("drops a card between two in another column, taking that column's status", () => {
    Story.story(
      BoardExample.update,
      Story.given(BoardExample.init()),
      Story.message(
        BoardExample.Message.GotBoardMessage({
          message: Board.Message.PressedCard({
            cardId: "deck",
            spot: "Body",
            pointerType: "mouse",
            screenX: 100,
            screenY: 100,
            clientX: 100,
            clientY: 100,
            columnsAtPress: BoardExample.boardColumns(BoardExample.init()),
          }),
        })
      ),
      Story.message(pointerAt(140, "Doing", 0)),
      resolveAnnounceMove,
      Story.message(pointerAt(160, "Todo", 1)),
      resolveAnnounceMove,
      Story.message(gotDragAndDrop(UiDragAndDrop.Message.ReleasedPointer())),
      Story.Command.expectHas(
        Announcer.Flash({ selector: "#sample-card-deck" })
      ),
      Story.Command.resolve(
        Announcer.Flash,
        BoardExample.Message.CompletedFlash()
      ),
      resolveAnnounceMove,
      Story.model((model) => {
        expect(Array.map(model.items, ({ id }) => id)).toStrictEqual([
          "sink",
          "deck",
          "taxes",
          "tyres",
        ]);
        expect(
          Option.map(
            Array.findFirst(model.items, ({ id }) => id === "deck"),
            ({ status }) => status
          )
        ).toStrictEqual(Option.some("Todo"));
      })
    );
  });
});
