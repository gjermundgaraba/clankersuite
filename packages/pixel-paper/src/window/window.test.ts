import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as Window from "./window.ts";

const Message = defineMessageUnion({ ClickedClose: {} });

type Message = typeof Message.Type;

const Model = Schema.Struct({ isOpen: Schema.Boolean });

type Model = typeof Model.Type;

const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedClose: () => ({ model: { isOpen: false } }),
  });

const windowView = (model: Model, h: HtmlBuilder<Message>) =>
  model.isOpen
    ? Window.view(
        {
          id: "shell",
          title: "Shell",
          lead: [
            h.button(
              [h.Class("iconbtn quiet"), h.AriaLabel("Move Shell")],
              ["::"]
            ),
          ],
          glyph: "plus",
          status: [h.span([h.Class("chip")], ["live"])],
          onClose: Message.ClickedClose(),
          isFlush: true,
          body: ["$ ls"],
        },
        h
      )
    : h.p([], ["closed"]);

describe("Window", () => {
  it("is a region named by its title, flush, leads with a grip, and closes from a named close glyph", () => {
    Scene.scene(
      { update, view: windowView },
      Scene.given<Model>({ isOpen: true }),
      Scene.expect(Scene.role("region", { name: "Shell" })).toHaveClass(
        "window"
      ),
      Scene.expect(Scene.role("region", { name: "Shell" })).toHaveClass(
        "flush"
      ),
      Scene.expect(Scene.selector(".panel-tb .chip")).toHaveText("live"),
      Scene.expect(Scene.selector(".panel-tb .panel-lead")).toContainText("::"),
      Scene.expect(Scene.selector(".window-body")).toHaveText("$ ls"),
      Scene.click(Scene.role("button", { name: "Close" })),
      Scene.expect(Scene.role("region")).toBeAbsent()
    );
  });

  it("takes a group of tools a child hands back as one, its buttons in the title bar", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          Window.view(
            {
              id: "page",
              title: "Page",
              tools: [
                h.span(
                  [h.Class("window-tools")],
                  [
                    h.button([h.Class("iconbtn"), h.AriaLabel("Back")], ["<"]),
                    h.button(
                      [h.Class("iconbtn"), h.AriaLabel("Reload")],
                      ["o"]
                    ),
                  ]
                ),
              ],
              onClose: Message.ClickedClose(),
              body: [],
            },
            h
          ),
      },
      Scene.given<Model>({ isOpen: true }),
      Scene.expect(Scene.selector(".panel-tb .window-tools")).toExist(),
      Scene.expect(Scene.role("button", { name: "Back" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Reload" })).toExist()
    );
  });
});
