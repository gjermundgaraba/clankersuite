// @vitest-environment-options { "settings": { "device": { "prefersReducedMotion": "reduce" } } }
import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { byId } from "../test/fixture.ts";
import * as Announcer from "./announcer.ts";

describe("flash with reduced motion", () => {
  it("holds the tint still for the beat instead of easing it", async () => {
    document.body.innerHTML = `<button id="tile" style="--semantic-duration-flash: 0.7s"></button>`;
    const recorded: unknown[] = [];
    Object.assign(byId("tile"), {
      getAnimations: () => [],
      animate: (
        keyframes: Parameters<Element["animate"]>[0],
        options: Parameters<Element["animate"]>[1]
      ) => {
        recorded.push({ keyframes, options });

        return {
          id: "gg-flash",
          cancel: () => {},
          addEventListener: () => {},
        };
      },
    });

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(
      true
    );
    expect(recorded).toStrictEqual([
      {
        keyframes: {
          boxShadow: [
            "inset 0 0 0 100vmax var(--semantic-color-background-selected)",
            "inset 0 0 0 100vmax var(--semantic-color-background-selected)",
          ],
        },
        options: { duration: 700, composite: "add", id: "gg-flash" },
      },
    ]);
  });
});
