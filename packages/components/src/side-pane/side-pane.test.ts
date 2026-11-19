import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import * as SidePane from "./side-pane.ts";

import RAIL from "../rail/rail.css?raw";
import STYLESHEET from "./side-pane.css?raw";
import TOKENS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

const NARROWEST_DECK = 421;

describe("SidePane", () => {
  it("is a named complementary landmark holding the application's contents", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          SidePane.view(
            {
              label: "Task details",
              body: [h.p([], ["Two pages: the goal and the budget."])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toHaveClass("gg-side-pane"),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toContainText("Two pages: the goal and the budget.")
    );
  });
});

describe("SidePane's breakpoint", () => {
  it("covers the page wherever the room right of the rail holds less than the pane and the narrowest deck", () => {
    const pane = Number(
      /--semantic-dimension-size-side-pane: (?<width>\d+)px;/u.exec(TOKENS)
        ?.groups?.["width"]
    );

    const least = pane + NARROWEST_DECK;

    expect(RAIL).toContain(
      ".gg-railed {\n  container: gg-railed / inline-size;"
    );
    expect(STYLESHEET).toContain(
      `@container gg-railed (width >= ${least}px) {\n  .gg-railed:has(.gg-side-pane) > * {`
    );
    expect(STYLESHEET).toContain(
      `@container gg-railed (width < ${least}px) {\n  .gg-side-pane {`
    );
  });
});
