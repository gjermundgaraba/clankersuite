import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Notice from "./notice.ts";

const update = (model: Notice.Tone) => ({ model });

const noticeView = (tone: Notice.Tone, h: HtmlBuilder<never>) =>
  Notice.view(
    {
      tone,
      title: "Offline",
      body: ["Changes wait here until the connection is back."],
      actions: [h.button([h.Type("button")], ["retry"])],
    },
    h
  );

describe("Notice", () => {
  it("is an alert when it says something went wrong", () => {
    Scene.scene(
      { update, view: noticeView },
      Scene.given<Notice.Tone>("Error"),
      Scene.expect(Scene.role("alert")).toHaveClass("notice"),
      Scene.expect(Scene.role("alert")).toHaveClass("error"),
      Scene.expect(Scene.role("alert")).toContainText("Offline")
    );
  });

  it("is quiet otherwise, with the glyph of its tone", () => {
    Scene.scene(
      { update, view: noticeView },
      Scene.given<Notice.Tone>("Warn"),
      Scene.expect(Scene.role("alert")).toBeAbsent(),
      Scene.expect(Scene.selector(".notice .glyph svg")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "retry" })).toExist()
    );
  });

  it("prints the tone's glyph box alone", () => {
    Scene.scene(
      {
        update,
        view: (tone: Notice.Tone, h: HtmlBuilder<never>) =>
          Notice.toneGlyphView({ tone }, h),
      },
      Scene.given<Notice.Tone>("Ok"),
      Scene.expect(Scene.selector("span.glyph")).toHaveClass("ok")
    );
  });
});
