import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Monogram from "./monogram.ts";

describe("Monogram", () => {
  it("prints the initials, hidden from screen readers", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Monogram.view({ label: "Sam Rivera", isLarge: true }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".monogram")).toHaveText("SR"),
      Scene.expect(Scene.selector(".monogram")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".monogram")).toHaveClass("large")
    );
  });

  it("prints a drawing in place of the letters, a run of ink to a cell, two pixels when large", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Monogram.view(
            {
              label: "Northwind Traders",
              drawing: `
                ##..
                .##.
                ..##
                #..#
              `,
              isLarge: true,
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".monogram")).toHaveClass("drawn"),
      Scene.expect(Scene.selector(".monogram")).toHaveText(""),
      Scene.expect(Scene.selector(".monogram svg")).toHaveAttr(
        "viewBox",
        "0 0 4 4"
      ),
      Scene.expect(Scene.selector(".monogram svg")).toHaveAttr("width", "8"),
      Scene.expectAll(Scene.all.selector(".monogram svg rect")).toHaveCount(5)
    );
  });

  it("prints the first letters of the first two words, or two of one word", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div(
            [],
            [
              Monogram.view({ label: "ops-bot.daily" }, h),
              Monogram.view({ label: "acme" }, h),
            ]
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.first(Scene.all.selector(".monogram"))).toHaveText(
        "ob"
      ),
      Scene.expect(Scene.last(Scene.all.selector(".monogram"))).toHaveText("ac")
    );
  });
});
