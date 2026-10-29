import { Effect } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { byId } from "../test/fixture.ts";
import { ANNOUNCER_ATTRIBUTE } from "./announcer.ts";
import * as Announcer from "./announcer.ts";

type Keyframes = Readonly<Record<string, readonly string[]>>;

type Animation = Readonly<{
  keyframes: Keyframes;
  options: KeyframeAnimationOptions;
}>;

const recordAnimations = (element: Element): Animation[] => {
  const recorded: Animation[] = [];
  Object.assign(element, {
    getAnimations: () => [],
    animate: (keyframes: Keyframes, options: KeyframeAnimationOptions) => {
      recorded.push({ keyframes, options });

      return { id: "pixel-paper-flash", cancel: () => {} };
    },
  });

  return recorded;
};

describe("Announcer view", () => {
  it("is one polite live region, empty until something is said", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) => Announcer.view(h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("status")).toHaveAttr("aria-live", "polite"),
      Scene.expect(Scene.role("status")).toHaveClass("sr-only"),
      Scene.expect(Scene.role("status")).toHaveText("")
    );
  });
});

describe("announce", () => {
  it("says words said together as one, in the topmost open dialog's region", async () => {
    document.body.innerHTML = `
      <div id="page" ${ANNOUNCER_ATTRIBUTE}></div>
      <dialog open><div id="in-dialog" ${ANNOUNCER_ATTRIBUTE}></div></dialog>`;

    await Effect.runPromise(
      Effect.all(
        [Announcer.announce("Copied plus."), Announcer.announce("Saved.")],
        {
          concurrency: "unbounded",
        }
      )
    );

    expect(document.querySelector("#in-dialog")?.textContent).toBe(
      "Copied plus. Saved."
    );
    expect(document.querySelector("#page")?.textContent).toBe("");
  });

  it("says the same words again", async () => {
    document.body.innerHTML = `<div id="page" ${ANNOUNCER_ATTRIBUTE}>Saved.</div>`;
    const region = document.querySelector("#page");
    const contents: Array<string | null | undefined> = [];
    new MutationObserver(() => {
      contents.push(region?.textContent);
    }).observe(region ?? document.body, {
      childList: true,
    });

    await Effect.runPromise(Announcer.announce("Saved."));

    expect(region?.textContent).toBe("Saved.");
    expect(contents).toContain("");
  });

  it("does nothing without a region on the page", async () => {
    await expect(
      Effect.runPromise(Announcer.announce("Saved."))
    ).resolves.toBeUndefined();
  });
});

describe("flash", () => {
  it("inverts the element for the middle half of the stylesheet's beat", async () => {
    document.body.innerHTML = `<button id="tile" style="--motion-flash: 0.7s"></button>`;
    const recorded = recordAnimations(byId("tile"));

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(recorded).toStrictEqual([
      {
        keyframes: { filter: ["invert(1)", "invert(1)"] },
        options: { duration: 350, delay: 175, id: "pixel-paper-flash" },
      },
    ]);
  });

  it("flashes nothing on a page without the stylesheet's beat", async () => {
    document.body.innerHTML = `<button id="tile"></button>`;
    const recorded = recordAnimations(byId("tile"));

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(recorded).toStrictEqual([]);
  });

  it("flashes nothing for a beat it cannot read as a time", async () => {
    document.body.innerHTML = `<button id="tile" style="--motion-flash: calc(0.7s * 2)"></button>`;
    const recorded = recordAnimations(byId("tile"));

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(recorded).toStrictEqual([]);
  });

  it("reads a unitless 0 as a beat of none", async () => {
    document.body.innerHTML = `<button id="tile" style="--motion-flash: 0"></button>`;
    const recorded = recordAnimations(byId("tile"));

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(recorded).toStrictEqual([
      {
        keyframes: { filter: ["invert(1)", "invert(1)"] },
        options: { duration: 0, delay: 0, id: "pixel-paper-flash" },
      },
    ]);
  });

  it("reads a beat written with an exponent", async () => {
    document.body.innerHTML = `<button id="tile" style="--motion-flash: 7e2ms"></button>`;
    const recorded = recordAnimations(byId("tile"));

    await Effect.runPromise(Announcer.flash("#tile"));

    expect(recorded).toStrictEqual([
      {
        keyframes: { filter: ["invert(1)", "invert(1)"] },
        options: { duration: 350, delay: 175, id: "pixel-paper-flash" },
      },
    ]);
  });
});
