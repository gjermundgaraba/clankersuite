import { Focus } from "@gjermundgaraba/components";
import { AsyncData, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, ReadUsage, init, update } from "./first-load.ts";

describe("the first load example", () => {
  it("fails the first read, then loads on retry", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.FailedReadUsage({ error: "No answer." })),
      Story.model((model) => {
        expect(AsyncData.isFailure(model.usage)).toBe(true);
      }),
      Story.message(Message.ClickedRetry()),
      Story.Command.expectExact(
        Focus.Focus({ id: "first-load-usage" }),
        ReadUsage({ attempt: 2 })
      ),
      Story.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Story.model((model) => {
        expect(AsyncData.isLoading(model.usage)).toBe(true);
      }),
      Story.Command.resolve(
        ReadUsage,
        Message.SucceededReadUsage({ tokens: 1_284_000 })
      ),
      Story.model((model) => {
        expect(AsyncData.isSuccess(model.usage)).toBe(true);
      })
    );
  });
});
