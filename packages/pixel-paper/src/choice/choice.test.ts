import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as Choices from "../choices/choices.ts";
import * as Choice from "./choice.ts";

const Model = Schema.Struct({ isNotifying: Schema.Boolean });

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  ToggledNotify: { isChecked: Schema.Boolean },
});

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    ToggledNotify: ({ isChecked }) => ({
      model: modifyFields(model, { isNotifying: () => isChecked }),
    }),
  });

const choiceView = (model: Model, h: HtmlBuilder<Message>) =>
  Choices.view(
    {
      isInline: true,
      body: [
        Choice.view(
          {
            id: "notify",
            label: "Notify me",
            note: "When it lands.",
            isChecked: model.isNotifying,
            onToggle: (isChecked) => Message.ToggledNotify({ isChecked }),
          },
          h
        ),
        Choice.view(
          {
            id: "plain",
            label: "Plain",
            isChecked: false,
            onToggle: (isChecked) => Message.ToggledNotify({ isChecked }),
          },
          h
        ),
      ],
    },
    h
  );

const box = Scene.role("checkbox", { name: "Notify me" });

describe("Choice", () => {
  it("is a checkbox named by its name, described by its note, toggled by either", () => {
    Scene.scene(
      { update, view: choiceView },
      Scene.given<Model>({ isNotifying: false }),
      Scene.expect(Scene.selector(".choices")).toHaveClass("inline"),
      Scene.expect(box).toHaveAttr("aria-checked", "false"),
      Scene.expect(box).toHaveAttr("aria-describedby", "notify-description"),
      Scene.expect(Scene.role("checkbox", { name: "Plain" })).not.toHaveAttr(
        "aria-describedby"
      ),
      Scene.click(box),
      Scene.expect(box).toHaveAttr("aria-checked", "true"),
      Scene.click(Scene.selector("#notify-label")),
      Scene.expect(box).toHaveAttr("aria-checked", "false")
    );
  });
});
