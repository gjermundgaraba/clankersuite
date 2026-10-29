import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Crumbs from "./crumbs.ts";

describe("Crumbs", () => {
  it("is a breadcrumb navigation that links up the path and marks where you are", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Crumbs.view(
            {
              crumbs: [
                { label: "Library", href: "/library" },
                { label: "Notes", href: "/library/notes" },
                { label: "today.md", href: "/library/notes/today" },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("navigation", { name: "Breadcrumb" })
      ).toHaveClass("crumbs"),
      Scene.expect(Scene.role("link", { name: "Library" })).toHaveAttr(
        "href",
        "/library"
      ),
      Scene.expect(Scene.role("link", { name: "Notes" })).toExist(),
      Scene.expect(Scene.role("link", { name: "today.md" })).toBeAbsent(),
      Scene.expect(Scene.selector('[aria-current="page"]')).toHaveText(
        "today.md"
      )
    );
  });
});
