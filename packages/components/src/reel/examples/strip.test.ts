import { Reel } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./strip.ts";
import type { Model } from "./strip.ts";

const columns = (model: Model): ReadonlyArray<readonly string[]> =>
  Array.map(model.layout, (column) => Array.map(column.panes, ({ id }) => id));

describe("the strip example", () => {
  it("applies what the reel's keys ask to the layout, focus kept on the pane", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.PressedReelKey({ action: "MovePaneRight" })),
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
        expect(Reel.focusedPaneId(model.reel, model.layout)).toStrictEqual(
          Option.some("shell")
        );
      })
    );
  });

  it("applies a resize, closes a pane and resets the layout", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotReelMessage({
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
      Story.message(Message.ClickedClose({ paneId: "diff" })),
      Story.model((model) => {
        expect(columns(model)).toStrictEqual([
          ["shell", "notes"],
          ["canvas"],
          ["browser", "log"],
        ]);
      }),
      Story.message(Message.ClickedReset()),
      Story.model((model) => {
        expect(columns(model)).toStrictEqual(columns(init().model));
      })
    );
  });

  it("moves focus, and the keyboard, to the neighbour of a pane closed under it", () => {
    const focused = update(
      init().model,
      Message.GotReelMessage({
        message: Reel.Message.FocusedPane({ paneId: "diff" }),
      })
    ).model;

    const closed = update(focused, Message.ClickedClose({ paneId: "diff" }));

    expect(
      Reel.focusedPaneId(closed.model.reel, closed.model.layout)
    ).toStrictEqual(Option.some("canvas"));
    expect(
      Array.map(closed.commands ?? [], ({ name, args }) => ({ name, args }))
    ).toStrictEqual([
      {
        name: "RestoreFocus",
        args: { paneHook: "workspace-reel/pane/canvas" },
      },
    ]);
  });
});
