import { Effect } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import * as Deck from "../deck/deck.ts";
import * as SkipLink from "./skip-link.ts";

const pageView = (_model: null, h: HtmlBuilder<never>) =>
  h.div([], [SkipLink.view(h), Deck.view({ body: [h.h1([], ["Inbox"])] }, h)]);

describe("SkipLink", () => {
  it("links to the main landmark the deck renders", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: pageView },
      Scene.given(null),
      Scene.expect(Scene.role("link", { name: "Skip to content" })).toHaveAttr(
        "href",
        "#main"
      ),
      Scene.expect(Scene.role("link", { name: "Skip to content" })).toHaveClass(
        "skip"
      ),
      Scene.expect(Scene.role("main")).toHaveId("main")
    );
  });

  it("moves focus to the fragment's target, making it focusable", async () => {
    document.body.innerHTML = `<a class="skip" href="#main">Skip</a><main id="main"></main>`;

    await Effect.runPromise(SkipLink.focusFragment("main"));

    expect(document.activeElement?.id).toBe("main");
    expect(document.querySelector("#main")?.getAttribute("tabindex")).toBe(
      "-1"
    );
    await Effect.runPromise(SkipLink.focusFragment("nowhere"));
    expect(document.activeElement?.id).toBe("main");
  });
});
