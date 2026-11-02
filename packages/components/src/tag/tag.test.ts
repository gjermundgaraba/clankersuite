import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as Tag from "./tag.ts";

const Message = defineMessageUnion({ ClickedTag: {} });

type Message = typeof Message.Type;

const update = (clicks: number) => ({ model: clicks + 1 });

const tagsView = (clicks: number, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      Tag.view({ label: "3", full: "3 in Operations" }, h),
      Tag.view(
        { label: "ops", full: "Operations", onClick: Message.ClickedTag() },
        h
      ),
      Tag.view({ label: "draft" }, h),
      h.output([], [`${clicks}`]),
    ]
  );

describe("Tag", () => {
  it("reads an abbreviated tag in full, its short words for the eye and its tip", () => {
    Scene.scene(
      { update, view: tagsView },
      Scene.given(0),
      Scene.expect(Scene.first(Scene.all.selector("span.tag"))).toHaveAttr(
        "data-tip",
        "3 in Operations"
      ),
      Scene.expect(Scene.selector("span.tag .sr-only")).toHaveText(
        "3 in Operations"
      ),
      Scene.expect(Scene.selector("span.tag [aria-hidden]")).toHaveText("3"),
      Scene.expect(Scene.last(Scene.all.selector("span.tag"))).not.toHaveAttr(
        "data-tip"
      ),
      Scene.expect(Scene.last(Scene.all.selector("span.tag"))).toHaveText(
        "draft"
      )
    );
  });

  it("is a button named in full when it acts", () => {
    Scene.scene(
      { update, view: tagsView },
      Scene.given(0),
      Scene.expect(Scene.role("button", { name: "Operations" })).toHaveClass(
        "tag"
      ),
      Scene.click(Scene.role("button", { name: "Operations" })),
      Scene.expect(Scene.selector("output")).toHaveText("1")
    );
  });
});
