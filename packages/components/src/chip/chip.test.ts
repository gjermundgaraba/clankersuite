import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as Mark from "../mark/mark.ts";
import * as Chip from "./chip.ts";

const Message = defineMessageUnion({ ToggledMark: {} });

type Message = typeof Message.Type;

const Model = Schema.Struct({ isMarked: Schema.Boolean });

type Model = typeof Model.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    ToggledMark: () => ({
      model: modifyFields(model, { isMarked: (isMarked) => !isMarked }),
    }),
  });

const rowView = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      Chip.view({ label: "building", tone: "Warn", isBusy: true }, h),
      Chip.view({ label: "live", tone: "Go" }, h),
      Chip.dotView({ label: "In progress", tone: "Go" }, h),
      Chip.dotView({ label: "To do" }, h),
      Mark.view({ label: "Needs attention" }, h),
      Mark.view(
        {
          label: "Flag",
          isPressed: model.isMarked,
          onToggle: Message.ToggledMark(),
          isPlain: true,
        },
        h
      ),
    ]
  );

describe("Chip and Mark", () => {
  it("print a state word and a named mark", () => {
    Scene.scene(
      { update, view: rowView },
      Scene.given<Model>({ isMarked: false }),
      Scene.expect(Scene.selector(".chip.warn")).toHaveText("building"),
      Scene.expect(Scene.selector(".chip.warn")).toHaveAttr(
        "aria-busy",
        "true"
      ),
      Scene.expect(Scene.selector(".chip .cursor")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".chip.go")).not.toHaveAttr("aria-busy"),
      Scene.expect(Scene.role("img", { name: "Needs attention" })).toHaveClass(
        "mark"
      ),
      Scene.expect(Scene.role("img", { name: "Needs attention" })).toHaveAttr(
        "data-tip",
        "Needs attention"
      )
    );
  });

  it("prints a chip as a dot named by its word, with the word as its tip", () => {
    Scene.scene(
      { update, view: rowView },
      Scene.given<Model>({ isMarked: false }),
      Scene.expect(Scene.role("img", { name: "In progress" })).toHaveClass(
        "chip-dot"
      ),
      Scene.expect(Scene.role("img", { name: "In progress" })).toHaveClass(
        "go"
      ),
      Scene.expect(Scene.role("img", { name: "In progress" })).toHaveAttr(
        "data-tip",
        "In progress"
      ),
      Scene.expect(Scene.role("img", { name: "In progress" })).toHaveText(""),
      Scene.expect(Scene.role("img", { name: "To do" })).toHaveAttr(
        "class",
        "chip-dot"
      )
    );
  });

  it("makes a mark a toggle button that says whether it is pressed", () => {
    Scene.scene(
      { update, view: rowView },
      Scene.given<Model>({ isMarked: false }),
      Scene.expect(Scene.role("button", { name: "Flag" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.expect(Scene.role("button", { name: "Flag" })).toHaveClass("plain"),
      Scene.click(Scene.role("button", { name: "Flag" })),
      Scene.expect(Scene.role("button", { name: "Flag" })).toHaveAttr(
        "aria-pressed",
        "true"
      )
    );
  });
});
