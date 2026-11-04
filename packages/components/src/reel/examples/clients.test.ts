import { Reel } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./clients.ts";

const fromStrip = (message: Reel.Message) =>
  Message.GotStripMessage({ message });

const resolveStrip = Story.Command.resolveAll(
  [Reel.AnnounceReel, Reel.Message.CompletedAnnounceReel()],
  [Reel.FocusPane, Reel.Message.CompletedFocusPane()],
  [Reel.ScrollIntoView, Reel.Message.CompletedScrollIntoView()]
);

describe("the clients example", () => {
  it("applies a resize asked in one reel to the layout both show, each keeping its own focus", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotStripMessage({
          message: Reel.Message.FocusedPane({ paneId: "diff" }),
        })
      ),
      Story.message(
        Message.GotStripMessage({
          message: Reel.Message.PressedSplitterKey({
            splitter: { _tag: "Width", columnId: "review" },
            share: 1 / 3,
          }),
        })
      ),
      Story.model((model) => {
        expect(Array.map(model.layout, ({ width }) => width)).toStrictEqual([
          1 / 2,
          0.8333,
          1 / 2,
        ]);
        expect(Reel.focusedPaneId(model.strip, model.layout)).toStrictEqual(
          Option.some("diff")
        );
        expect(Reel.focusedPaneId(model.tabs, model.layout)).toStrictEqual(
          Option.some("shell")
        );
      })
    );
  });

  it("keeps the other reel's focus on its pane when a move in one reel shifts the columns", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotTabsMessage({
          message: Reel.Message.FocusedPane({ paneId: "log" }),
        })
      ),
      Story.message(fromStrip(Reel.Message.PressedGripKey({ paneId: "diff" }))),
      resolveStrip,
      Story.message(
        fromStrip(Reel.Message.PressedHeldArrowKey({ step: "Left" }))
      ),
      resolveStrip,
      Story.message(fromStrip(Reel.Message.PressedHeldDropKey())),
      resolveStrip,
      Story.model((model) => {
        expect(Array.map(model.layout, ({ id }) => id)).toStrictEqual([
          "work",
          "watch",
        ]);
        expect(model.tabs.maybeFocus).toStrictEqual(
          Option.some({ paneId: "log", column: 1, row: 0 })
        );
      })
    );
  });
});
