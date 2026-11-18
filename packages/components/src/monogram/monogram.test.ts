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
      Scene.expect(Scene.selector(".gg-monogram")).toHaveText("SR"),
      Scene.expect(Scene.selector(".gg-monogram")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".gg-monogram")).toHaveClass("gg-large")
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
      Scene.expect(Scene.first(Scene.all.selector(".gg-monogram"))).toHaveText(
        "ob"
      ),
      Scene.expect(Scene.last(Scene.all.selector(".gg-monogram"))).toHaveText(
        "ac"
      )
    );
  });

  it("takes only letters and digits from each word, so punctuation never prints", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          h.div(
            [],
            [
              Monogram.view({ label: "Factory (Droid)" }, h),
              Monogram.view({ label: "xAI / Grok" }, h),
            ]
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.first(Scene.all.selector(".gg-monogram"))).toHaveText(
        "FD"
      ),
      Scene.expect(Scene.last(Scene.all.selector(".gg-monogram"))).toHaveText(
        "xG"
      )
    );
  });
});
