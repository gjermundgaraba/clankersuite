import { Option } from "effect";
import { Scene, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update, view } from "./clock.ts";

const OPENED_AT = Date.UTC(2026, 5, 1, 9, 0);
const MINUTE = 60_000;

const at = (now: number) => ({
  maybeNow: Option.some(now),
  maybeOpenedAt: Option.some(OPENED_AT),
});

describe("the clock example", () => {
  it("keeps the time of the first tick as the moment the page opened", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.TickedClock({ now: OPENED_AT })),
      Story.message(Message.TickedClock({ now: OPENED_AT + 1000 })),
      Story.model((model) => {
        expect(model.maybeNow).toStrictEqual(Option.some(OPENED_AT + 1000));
        expect(model.maybeOpenedAt).toStrictEqual(Option.some(OPENED_AT));
      })
    );
  });

  it("says each moment against the clock, the old age stale", () => {
    Scene.scene(
      { update, view },
      Scene.given(at(OPENED_AT)),
      Scene.expect(Scene.text("4m")).toExist(),
      Scene.expect(Scene.text("2h ago")).toExist(),
      Scene.expect(Scene.selector("time.gg-stale")).toHaveText("19d"),
      Scene.expect(Scene.text("in 1m")).toExist()
    );
  });

  it("says the countdown has passed a minute after the page opened", () => {
    Scene.scene(
      { update, view },
      Scene.given(at(OPENED_AT + MINUTE + 1000)),
      Scene.expect(Scene.text("reset due")).toExist()
    );
  });
});
