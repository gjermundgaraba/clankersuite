import { Reel } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ReelExample from "./reel.ts";

const columns = (model: ReelExample.Model): ReadonlyArray<readonly string[]> =>
  Array.map(model.layout, (column) => Array.map(column.panes, ({ id }) => id));

describe("Reel example", () => {
  it("applies what the first reel's keys ask to the one layout both reels show", () => {
    Story.story(
      ReelExample.update,
      Story.given(ReelExample.init()),
      Story.message(
        ReelExample.Message.PressedReelKey({ action: "MovePaneRight" })
      ),
      Story.Command.resolve(
        Reel.ScrollIntoView,
        Reel.Message.CompletedScrollIntoView()
      ),
      Story.Command.resolve(
        Reel.AnnounceReel,
        Reel.Message.CompletedAnnounceReel()
      ),
      Story.model((model) => {
        expect(columns(model)).toStrictEqual([
          ["notes"],
          ["shell", "diff"],
          ["canvas"],
          ["browser", "log"],
        ]);
        expect(Reel.focusedPaneId(model.paper, model.layout)).toStrictEqual(
          Option.some("shell")
        );
        expect(Reel.focusedPaneId(model.plum, model.layout)).toStrictEqual(
          Option.some("notes")
        );
      })
    );
  });

  it("applies a resize asked in the second reel, and closes a pane and resets", () => {
    Story.story(
      ReelExample.update,
      Story.given(ReelExample.init()),
      Story.message(
        ReelExample.Message.GotPlumMessage({
          message: Reel.Message.PressedSplitterKey({
            splitter: { _tag: "Width", columnId: "review" },
            share: 1 / 3,
          }),
        })
      ),
      Story.model((model) => {
        expect(Array.map(model.layout, ({ width }) => width)).toStrictEqual([
          1 / 2,
          1,
          1 / 2,
          1 / 3,
        ]);
      }),
      Story.message(ReelExample.Message.ClickedClose({ paneId: "diff" })),
      Story.model((model) => {
        expect(columns(model)).toStrictEqual([
          ["shell", "notes"],
          ["canvas"],
          ["browser", "log"],
        ]);
      }),
      Story.message(ReelExample.Message.ClickedReset()),
      Story.model((model) => {
        expect(columns(model)).toStrictEqual(columns(ReelExample.init()));
      })
    );
  });

  it("moves a reel's focus, and the keyboard, to the neighbour of a pane closed under it", () => {
    const focused = ReelExample.update(
      ReelExample.init(),
      ReelExample.Message.GotPaperMessage({
        message: Reel.Message.FocusedPane({ paneId: "diff" }),
      })
    ).model;

    const closed = ReelExample.update(
      focused,
      ReelExample.Message.ClickedClose({ paneId: "diff" })
    );

    expect(
      Reel.focusedPaneId(closed.model.paper, closed.model.layout)
    ).toStrictEqual(Option.some("canvas"));
    expect(
      Array.map(closed.commands ?? [], ({ name, args }) => ({ name, args }))
    ).toStrictEqual([
      { name: "RestoreFocus", args: { paneHook: "sample-reel/pane/canvas" } },
    ]);
  });
});
