import { Reel } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./workbench.ts";

describe("the workbench example", () => {
  it("applies a resize the reel asks for to its layout", () => {
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
          0.8333,
        ]);
      })
    );
  });
});
