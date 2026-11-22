import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as PageHead from "./page-head.ts";

describe("PageHead", () => {
  it("names the screen as its h1, its count beside it, its actions after", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PageHead.view(
            {
              title: "Queue",
              meta: "12 items",
              actions: [h.button([], ["add"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("heading", { name: "Queue", level: 1 })
      ).toHaveClass("gg-page-title"),
      Scene.expect(Scene.selector(".gg-page-name p")).toHaveText("12 items"),
      Scene.expect(Scene.selector(".gg-page-acts button")).toHaveText("add")
    );
  });

  it("leads the title with its glyph and prints the strip under the head", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PageHead.view(
            {
              title: "Focus",
              glyph: "star",
              strip: [h.span([], ["Ship the beta"])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("heading", { name: "Focus", level: 1 })
      ).toExist(),
      Scene.expect(Scene.selector("h1 svg")).toHaveAttr("aria-hidden", "true"),
      Scene.expect(Scene.selector(".gg-page-strip")).toHaveText("Ship the beta")
    );
  });

  it("puts the caller's attributes on its h1", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PageHead.view(
            {
              title: "Archive",
              titleAttributes: [h.Id("archive-heading")],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("heading", { name: "Archive", level: 1 })
      ).toHaveAttr("id", "archive-heading"),
      Scene.expect(Scene.selector("#archive-heading")).toHaveClass(
        "gg-page-title"
      )
    );
  });
});
