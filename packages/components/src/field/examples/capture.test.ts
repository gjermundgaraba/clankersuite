import { Field } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Scene } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import {
  BindCaptureKeys,
  Message,
  captureKey,
  init,
  update,
  view,
} from "./capture.ts";

const field = Scene.role("combobox", { name: "New task" });

const keydown = (key: string, modifiers: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", { key, cancelable: true, ...modifiers });

describe("the capture example", () => {
  it("suggests the tasks an @ names, and picks one with a click", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.Mount.resolve(
        { name: Field.BindSuggestions.name },
        Message.GotFieldMessage({
          message: Field.Message.CompletedBindSuggestions(),
        })
      ),
      Scene.Mount.resolve(BindCaptureKeys, Message.CompletedBindCaptureKeys()),
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
      Scene.click(Scene.role("option", { name: /^Review budget/u })),
      Scene.expect(field).toHaveValue(
        "Write release notes fri +mem @Review budget "
      ),
      Scene.expect(field).toHaveAttr("aria-expanded", "false"),
      Scene.expect(Scene.role("listbox")).not.toExist(),
      Scene.Mount.expectEnded(Field.BindSuggestions)
    );
  });

  it("moves with plain arrows and picks with a plain Enter, leaving an IME's or a modified key", () => {
    expect(captureKey(keydown("ArrowDown"))).toStrictEqual(
      Option.some(Message.PressedArrow({ isDown: true }))
    );
    expect(captureKey(keydown("Enter"))).toStrictEqual(
      Option.some(Message.PressedEnter())
    );
    expect(captureKey(keydown("Enter", { isComposing: true }))).toStrictEqual(
      Option.none()
    );
    expect(captureKey(keydown("Enter", { shiftKey: true }))).toStrictEqual(
      Option.none()
    );

    const typed = update(
      init().model,
      Message.UpdatedValue({ value: "Write release notes @" })
    ).model;

    const moved = update(typed, Message.PressedArrow({ isDown: true })).model;

    expect(update(moved, Message.PressedEnter()).model.value).toBe(
      "Write release notes @Write migration guide "
    );
  });
});
