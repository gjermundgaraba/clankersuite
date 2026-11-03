import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./activity.ts";

describe("the activity example", () => {
  it("pages back through older activity and returns to the latest", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedOlderActivity()),
      Story.message(Message.ClickedOlderActivity()),
      Story.model((model) => {
        expect(model.pageIndex).toBe(2);
      }),
      Story.message(Message.ClickedLatestActivity()),
      Story.model((model) => {
        expect(model.pageIndex).toBe(0);
      })
    );
  });
});
