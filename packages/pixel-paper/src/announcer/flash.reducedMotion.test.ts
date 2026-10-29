// @vitest-environment-options { "settings": { "device": { "prefersReducedMotion": "reduce" } } }
import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { byId } from "../test/fixture.ts";
import * as Announcer from "./announcer.ts";

describe("flash with reduced motion", () => {
  it("holds a still ink ring for the beat instead of inverting", async () => {
    document.body.innerHTML = `<button id="tile" style="--motion-flash: 0.7s"></button>`;
    const recorded: unknown[] = [];
    Object.assign(byId("tile"), {
      getAnimations: () => [],
      animate: (
        keyframes: Parameters<Element["animate"]>[0],
        options: Parameters<Element["animate"]>[1]
      ) => {
        recorded.push({ keyframes, options });

        return { id: "pixel-paper-flash", cancel: () => {} };
      },
    });

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(
      true
    );
    expect(recorded).toStrictEqual([
      {
        keyframes: {
          outline: [
            "var(--line) solid var(--ink)",
            "var(--line) solid var(--ink)",
          ],
          outlineOffset: ["-2px", "-2px"],
        },
        options: { duration: 700, id: "pixel-paper-flash" },
      },
    ]);
  });
});
