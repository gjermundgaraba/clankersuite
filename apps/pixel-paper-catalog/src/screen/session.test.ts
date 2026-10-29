import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as SessionScreen from "./session.ts";

describe("Session screen", () => {
  it("holds the retry busy until its wait is over", () => {
    Story.story(
      SessionScreen.update,
      Story.given(SessionScreen.init()),
      Story.message(SessionScreen.Message.ClickedRetry()),
      Story.Command.expectExact(SessionScreen.WaitBeforeRetry()),
      Story.model((model) => {
        expect(model.isTrying).toBe(true);
      }),
      Story.Command.resolve(
        SessionScreen.WaitBeforeRetry,
        SessionScreen.Message.CompletedWaitBeforeRetry()
      ),
      Story.model((model) => {
        expect(model.isTrying).toBe(false);
      })
    );
  });
});
