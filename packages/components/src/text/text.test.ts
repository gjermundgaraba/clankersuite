import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Text from "./text.ts";

const update = (model: null) => ({ model });

const textView =
  (toConfig: (h: HtmlBuilder<never>) => Text.ViewConfig<never>) =>
  (_model: null, h: HtmlBuilder<never>) =>
    h.div([], [Text.view(toConfig(h), h)]);

describe("Text", () => {
  it("prints a meta inline and a note as a paragraph, each in its voice", () => {
    Scene.scene(
      { update, view: textView(() => ({ tone: "Meta", body: ["owner"] })) },
      Scene.given(null),
      Scene.expect(Scene.selector("span.gg-meta")).toHaveText("owner")
    );
    Scene.scene(
      {
        update,
        view: textView(() => ({ tone: "Note", body: ["No matching tasks"] })),
      },
      Scene.given(null),
      Scene.expect(Scene.selector("p.gg-note-line")).toHaveText(
        "No matching tasks"
      )
    );
  });

  it("turns either with isInline", () => {
    Scene.scene(
      {
        update,
        view: textView(() => ({
          tone: "Meta",
          body: ["on its own"],
          isInline: false,
        })),
      },
      Scene.given(null),
      Scene.expect(Scene.selector("p.gg-meta")).toExist()
    );
    Scene.scene(
      {
        update,
        view: textView(() => ({
          tone: "Note",
          body: ["in a line"],
          isInline: true,
        })),
      },
      Scene.given(null),
      Scene.expect(Scene.selector("span.gg-note-line")).toExist()
    );
  });

  it("takes the caller's attributes, its class kept", () => {
    Scene.scene(
      {
        update,
        view: textView((h) => ({
          tone: "Note",
          body: ["a hint"],
          attributes: [h.Id("hint")],
        })),
      },
      Scene.given(null),
      Scene.expect(Scene.selector("#hint")).toHaveClass("gg-note-line")
    );
  });
});
