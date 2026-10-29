import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Monogram from "./monogram.ts";

describe("Monogram", () => {
  it("is an image named by whose mark it is", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Monogram.view(
            { label: "Sam Rivera", isCurrent: true, isLarge: true },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("img", { name: "Sam Rivera" })).toHaveText("SR"),
      Scene.expect(Scene.role("img")).toHaveClass("current"),
      Scene.expect(Scene.role("img")).toHaveClass("large")
    );
  });

  it("prints given letters in place of the initials", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Monogram.view({ label: "Northwind Traders", letters: "N" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("img", { name: "Northwind Traders" })).toHaveText(
        "N"
      )
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
      Scene.expect(
        Scene.role("img", { name: "Northwind Traders" })
      ).toHaveClass("drawn"),
      Scene.expect(Scene.role("img", { name: "Northwind Traders" })).toHaveText(
        ""
      ),
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
      Scene.expect(Scene.role("img", { name: "ops-bot.daily" })).toHaveText(
        "ob"
      ),
      Scene.expect(Scene.role("img", { name: "acme" })).toHaveText("ac")
    );
  });
});
