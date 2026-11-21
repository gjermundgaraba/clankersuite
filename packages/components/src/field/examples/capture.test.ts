import { Field } from "@gjermundgaraba/components";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, init, update, view } from "./capture.ts";

const field = Scene.role("combobox", { name: "New task" });

describe("the capture example", () => {
  it("suggests the tasks an @ names, moves through them with the arrows, and picks one", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.Mount.resolve(
        { name: Field.BindSuggestions.name },
        Message.GotFieldMessage({
          message: Field.Message.CompletedBindSuggestions(),
        })
      ),
      Scene.expect(field).toHaveAttr("aria-expanded", "true"),
      Scene.expect(field).toHaveAttr(
        "aria-controls",
        "field-capture-suggestions"
      ),
      Scene.expect(Scene.role("listbox", { name: "Put it under" })).toExist(),
      Scene.expect(
        Scene.role("option", { name: "Launch clankermem v1, Work" })
      ).toHaveAttr("aria-selected", "true"),
      Scene.expect(field).toHaveAttr(
        "aria-activedescendant",
        "field-capture-suggestion-launch"
      ),
      Scene.type(field, "Write release notes fri +mem @"),
      Scene.keydown(field, "ArrowDown"),
      Scene.expect(
        Scene.role("option", {
          name: "Write migration guide, Work › Launch clankermem v1",
        })
      ).toHaveAttr("aria-selected", "true"),
      Scene.click(Scene.role("option", { name: /^Review budget/u })),
      Scene.expect(field).toHaveValue(
        "Write release notes fri +mem @Review budget "
      ),
      Scene.expect(field).toHaveAttr("aria-expanded", "false"),
      Scene.expect(Scene.role("listbox")).not.toExist(),
      Scene.Mount.expectEnded(Field.BindSuggestions)
    );
  });
});
