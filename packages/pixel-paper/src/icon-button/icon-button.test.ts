import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as IconButton from "./icon-button.ts";

type Model = number;

const Message = defineMessageUnion({ Clicked: {} });

type Message = typeof Message.Type;

const update = (model: Model) => ({ model: model + 1 });

const counter = <M>(model: Model, h: HtmlBuilder<M>) =>
  h.output([h.Class("count")], [`${model}`]);

describe("IconButton", () => {
  it("is named by its label, which is also its tip", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          h.div(
            [],
            [
              IconButton.view(
                {
                  glyph: "copy",
                  label: "Copy",
                  onClick: Message.Clicked(),
                  isQuiet: true,
                },
                h
              ),
              counter(model, h),
            ]
          ),
      },
      Scene.given<Model>(0),
      Scene.expect(Scene.role("button", { name: "Copy" })).toHaveAttr(
        "data-tip",
        "Copy"
      ),
      Scene.expect(Scene.role("button", { name: "Copy" })).toHaveClass("quiet"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("aria-hidden", "true"),
      Scene.click(Scene.role("button", { name: "Copy" })),
      Scene.expect(Scene.selector(".count")).toHaveText("1")
    );
  });

  it("stays focusable and inert when disabled", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          IconButton.view(
            {
              glyph: "copy",
              label: "Copy",
              onClick: Message.Clicked(),
              isDisabled: true,
            },
            h
          ),
      },
      Scene.given<Model>(0),
      Scene.expect(Scene.role("button", { name: "Copy" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "Copy" })).not.toHaveAttr(
        "disabled"
      ),
      Scene.expect(Scene.role("button", { name: "Copy" })).not.toHaveHandler(
        "click"
      )
    );
  });

  it("names its key for the tip, and keeps its name to its label", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          IconButton.view(
            {
              glyph: "sidebar",
              label: "Hide tasks",
              keyHint: { keys: "Mod+B", platform: "Apple" },
            },
            h
          ),
      },
      Scene.given<Model>(0),
      Scene.expect(Scene.role("button", { name: "Hide tasks" })).toHaveAttr(
        "data-tip-key",
        "⌘B"
      ),
      Scene.expect(Scene.role("button", { name: "Hide tasks" })).toHaveAttr(
        "data-tip",
        "Hide tasks"
      )
    );
  });
});
