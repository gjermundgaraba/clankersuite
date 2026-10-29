import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Wordmark from "./wordmark.ts";

describe("Wordmark", () => {
  it("links home when given a link, with its cursor hidden", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Wordmark.view({ label: "pixel paper", href: "/" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("link", { name: "pixel paper" })).toHaveAttr(
        "href",
        "/"
      ),
      Scene.expect(Scene.selector(".wordmark .cursor")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });

  it("is plain text without one", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Wordmark.view({ label: "ledger" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.role("link")).toBeAbsent(),
      Scene.expect(Scene.selector("span.wordmark")).toHaveText("ledger")
    );
  });
});
