import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./tasks.ts";

describe("the tasks example", () => {
  it("opens the task its tool names", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.OpenedTask({ id: "taxes" })),
      Story.model((model) => {
        expect(model.maybeOpenId).toStrictEqual(Option.some("taxes"));
      })
    );
  });
});
