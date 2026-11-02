import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as Segmented from "./segmented.ts";

const Density = Schema.Literals(["Roomy", "Dense"]);

type Density = typeof Density.Type;

const Message = defineMessageUnion({ SelectedDensity: { density: Density } });

type Message = typeof Message.Type;

const update = (_model: Density, message: Message) =>
  Message.match<Update.Return<Density, Message>>(message, {
    SelectedDensity: ({ density }) => ({ model: density }),
  });

const segmentedView = (model: Density, h: HtmlBuilder<Message>) =>
  Segmented.view(
    {
      label: "Density",
      value: model,
      onSelect: (density) => Message.SelectedDensity({ density }),
      options: [
        { value: "Roomy", label: "roomy" },
        { value: "Dense", label: "dense" },
      ],
    },
    h
  );

describe("Segmented", () => {
  it("is a named group whose pressed segment follows the choice", () => {
    Scene.scene(
      { update, view: segmentedView },
      Scene.given<Density>("Roomy"),
      Scene.expect(Scene.role("group", { name: "Density" })).toHaveClass("nav"),
      Scene.expect(Scene.role("button", { name: "roomy" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "dense" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.click(Scene.role("button", { name: "dense" })),
      Scene.expect(Scene.role("button", { name: "dense" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "roomy" })).toHaveAttr(
        "aria-pressed",
        "false"
      )
    );
  });
});
