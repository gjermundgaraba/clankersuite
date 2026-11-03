import { Reel } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./clients.ts";

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
});
