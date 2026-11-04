import { Scene } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Text from "./text.ts";

const update = (model: null) => ({ model });

const textView =
  (toText: (h: HtmlBuilder<never>) => Html) =>
  (_model: null, h: HtmlBuilder<never>) =>
    h.div([], [toText(h)]);

describe("Text", () => {
  it("prints a meta inline and a note as a paragraph, each in its voice", () => {
    Scene.scene(
      { update, view: textView((h) => Text.meta(["owner"], h)) },
      Scene.given(null),
      Scene.expect(Scene.selector("span.gg-meta")).toHaveText("owner")
    );
    Scene.scene(
      { update, view: textView((h) => Text.note(["No matching tasks"], h)) },
      Scene.given(null),
      Scene.expect(Scene.selector("p.gg-note-line")).toHaveText(
        "No matching tasks"
      )
    );
  });
});
