import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as LinkButton from "./link-button.ts";

type Model = number;

const Message = defineMessageUnion({ Clicked: {} });

type Message = typeof Message.Type;

const update = (model: Model) => ({ model: model + 1 });

describe("LinkButton", () => {
  it("is a link named by its words, printed as a button", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          LinkButton.view(
            {
              label: "open the docs",
              href: "/docs",
              glyph: "arrow-right",
              variant: "Primary",
            },
            h
          ),
      },
      Scene.given<Model>(0),
      Scene.expect(Scene.role("link", { name: "open the docs" })).toHaveAttr(
        "href",
        "/docs"
      ),
      Scene.expect(Scene.role("link", { name: "open the docs" })).toHaveClass(
        "btn"
      ),
      Scene.expect(Scene.role("link", { name: "open the docs" })).toHaveClass(
        "primary"
      )
    );
  });
});
