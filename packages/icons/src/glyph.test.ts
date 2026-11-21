import { Record } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import { view } from "./glyph.ts";
import { glyphs } from "./glyphs.ts";
import type { GlyphName } from "./glyphs.ts";

const glyphScene = (name: GlyphName) => ({
  update: (model: null) => ({ model }),
  view: (_model: null, h: HtmlBuilder<never>) => view({ name }, h),
});

describe("Glyph.view", () => {
  it.each(Record.keys(glyphs))(
    "draws %s as a decorative svg holding a path",
    (name) => {
      Scene.scene(
        glyphScene(name),
        Scene.given(null),
        Scene.expect(Scene.selector("svg.gg-icon")).toHaveAttr(
          "aria-hidden",
          "true"
        ),
        Scene.expect(Scene.selector("svg path")).toExist()
      );
    }
  );

  it("prints 16px in currentColor", () => {
    Scene.scene(
      glyphScene("check"),
      Scene.given(null),
      Scene.expect(Scene.selector("svg")).toHaveAttr("width", "16"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("height", "16"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("stroke", "currentColor")
    );
  });

  it("fills a solid glyph in currentColor", () => {
    Scene.scene(
      glyphScene("dot"),
      Scene.given(null),
      Scene.expect(Scene.selector("svg path")).toHaveAttr(
        "fill",
        "currentColor"
      )
    );
  });
});
