import { Duration, Effect, Option, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { renderOnPage } from "../test/fixture.ts";
import * as Time from "./time.ts";

const AT = Date.UTC(2026, 2, 12, 14, 5);

const minutes = (count: number): number =>
  Duration.toMillis(Duration.minutes(count));

const timeScene = (
  config: Time.ViewConfig,
  ...steps: ReadonlyArray<Scene.SceneStep<null, never, undefined>>
) => {
  Scene.scene(
    {
      update: (model: null) => ({ model }),
      view: (_model: null, h: HtmlBuilder<never>) => Time.view(config, h),
    },
    Scene.given(null),
    ...steps
  );
};

const time = Scene.selector("time");

describe("Time.view", () => {
  it("prints the moment in UTC until the clock has ticked", () => {
    timeScene(
      { at: AT, maybeNow: Option.none() },
      Scene.expect(time).toHaveText("12 Mar 2026, 14:05 UTC")
    );
    timeScene(
      { at: AT, format: "Date", maybeNow: Option.none() },
      Scene.expect(time).toHaveText("12 Mar 2026")
    );
  });

  it("writes the moment's ISO form in datetime", async () => {
    await renderOnPage(null, (_model, h: HtmlBuilder<never>) =>
      Time.view({ at: AT, maybeNow: Option.none() }, h)
    );

    expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-03-12T14:05:00.000Z"
    );
  });

  it("says an age, and prints it stale past staleAfter", () => {
    timeScene(
      { at: AT, maybeNow: Option.some(AT + minutes(4)) },
      Scene.expect(time).toHaveText("4m"),
      Scene.expect(time).toHaveClass("age"),
      Scene.expect(time).not.toHaveClass("stale")
    );
    timeScene(
      {
        at: AT,
        format: "Ago",
        maybeNow: Option.some(AT + minutes(4)),
        staleAfter: Duration.minutes(1),
      },
      Scene.expect(time).toHaveText("4m ago"),
      Scene.expect(time).toHaveClass("stale")
    );
    timeScene(
      { at: AT, format: "Ago", maybeNow: Option.some(AT + 2000) },
      Scene.expect(time).toHaveText("just now")
    );
  });

  it("counts down, then prints the passed word, red when late", () => {
    timeScene(
      { at: AT, format: "Until", maybeNow: Option.some(AT - minutes(101)) },
      Scene.expect(time).toHaveText("in 1h 41m"),
      Scene.expect(time).toHaveClass("due")
    );
    timeScene(
      {
        at: AT,
        format: "Until",
        maybeNow: Option.some(AT + 1),
        passed: "expired",
        isLate: true,
      },
      Scene.expect(time).toHaveText("expired"),
      Scene.expect(time).toHaveClass("late")
    );
  });
});

describe("Time.clockEntry", () => {
  const entry = Time.clockEntry({
    isActive: (model: Readonly<{ hasTimes: boolean }>) => model.hasTimes,
    toMessage: (now) => now,
  });

  it("emits the current time at once while active", async () => {
    const before = Date.now();

    const maybeFirst = await Effect.runPromise(
      Stream.runHead(
        entry.dependenciesToStream(
          entry.modelToDependencies({ hasTimes: true })
        )
      )
    );

    expect(Option.getOrThrow(maybeFirst)).toBeGreaterThanOrEqual(before);
  });

  it("emits nothing while inactive", async () => {
    const all = await Effect.runPromise(
      Stream.runCollect(
        entry.dependenciesToStream(
          entry.modelToDependencies({ hasTimes: false })
        )
      )
    );

    expect([...all]).toStrictEqual([]);
  });
});
