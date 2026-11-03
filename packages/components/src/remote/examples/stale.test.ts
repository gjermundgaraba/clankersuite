import { Focus } from "@gjermundgaraba/components";
import { Option } from "effect";
import { AsyncData, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, ReadRequests, init, update } from "./stale.ts";

describe("the stale example", () => {
  it("refreshes the stale reading on retry, keeping it shown until it is read", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedRetry()),
      Story.Command.expectExact(
        Focus.Focus({ id: "stale-requests" }),
        ReadRequests()
      ),
      Story.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Story.model((model) => {
        expect(AsyncData.isRefreshing(model.requests)).toBe(true);
        expect(AsyncData.getData(model.requests)).toStrictEqual(
          Option.some(41_200)
        );
      }),
      Story.Command.resolve(
        ReadRequests,
        Message.SucceededReadRequests({ requests: 41_350 })
      ),
      Story.model((model) => {
        expect(AsyncData.getData(model.requests)).toStrictEqual(
          Option.some(41_350)
        );
        expect(AsyncData.isSuccess(model.requests)).toBe(true);
      })
    );
  });
});
