import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as NavStrip from "./nav-strip.ts";

describe("NavStrip", () => {
  it("is a named navigation of links, the current page marked, counts after labels past a hidden space", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          NavStrip.view(
            {
              label: "Sections",
              items: [
                { href: "/queue", label: "queue", count: 3, isCurrent: true },
                { href: "/done", label: "done" },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("navigation", { name: "Sections" })).toHaveClass(
        "nav"
      ),
      Scene.expect(Scene.role("link", { name: "queue 3" })).toHaveAttr(
        "aria-current",
        "page"
      ),
      Scene.expect(Scene.selector(".navnum")).toHaveText("3"),
      Scene.expect(Scene.selector('a[href="/queue"] .sr-only')).toExist(),
      Scene.expect(Scene.role("link", { name: "done" })).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(Scene.role("link", { name: "done" })).toHaveAttr(
        "href",
        "/done"
      )
    );
  });
});
