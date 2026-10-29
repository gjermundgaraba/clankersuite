import { Focus } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { AsyncData, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as StatesExample from "./states.ts";

describe("States example", () => {
  it("refreshes the stale reading on retry, keeping it shown until it is read", () => {
    Story.story(
      StatesExample.update,
      Story.given(StatesExample.init()),
      Story.message(StatesExample.Message.ClickedRetryReading()),
      Story.Command.expectExact(
        Focus.Focus({ id: "sample-reading" }),
        StatesExample.ReadSample()
      ),
      Story.Command.resolve(
        Focus.Focus,
        StatesExample.Message.CompletedFocus()
      ),
      Story.model((model) => {
        expect(AsyncData.isRefreshing(model.reading)).toBe(true);
        expect(AsyncData.getData(model.reading)).toStrictEqual(
          Option.some(41_200)
        );
      }),
      Story.Command.resolve(
        StatesExample.ReadSample,
        StatesExample.Message.CompletedReadSample()
      ),
      Story.model((model) => {
        expect(AsyncData.isSuccess(model.reading)).toBe(true);
      })
    );
  });
});
