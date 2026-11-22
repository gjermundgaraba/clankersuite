import { Field } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Scene } from "foldkit";
import { afterEach, assert, describe, expect, it } from "vite-plus/test";

import { disposeEmbedded, embed } from "../../test/embed.ts";
import { byId } from "../../test/fixture.ts";
import { settle, settleUntil } from "../../test/settle.ts";
import {
  BindCaptureKeys,
  Message,
  Model,
  captureKey,
  init,
  update,
  view,
} from "./capture.ts";

const field = Scene.role("combobox", { name: "New task" });

const keydown = (key: string, modifiers: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", { key, cancelable: true, ...modifiers });

describe("the capture example", () => {
  afterEach(disposeEmbedded);

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
    expect(captureKey(keydown("ArrowDown"), true)).toStrictEqual(
      Option.some(Message.PressedArrow({ isDown: true }))
    );
    expect(captureKey(keydown("Enter"), true)).toStrictEqual(
      Option.some(Message.PressedEnter())
    );
    expect(
      captureKey(keydown("Enter", { isComposing: true }), true)
    ).toStrictEqual(Option.none());
    expect(
      captureKey(keydown("Enter", { shiftKey: true }), true)
    ).toStrictEqual(Option.none());

    const typed = update(
      init().model,
      Message.UpdatedValue({ value: "Write release notes @" })
    ).model;

    const moved = update(typed, Message.PressedArrow({ isDown: true })).model;

    expect(update(moved, Message.PressedEnter()).model.value).toBe(
      "Write release notes @Write migration guide "
    );
  });

  it("takes Enter and the arrows only while the suggestions show, and leaves them to the field otherwise", async () => {
    embed({ Model, init, update, view });
    await settleUntil(() => document.querySelector("#field-capture") !== null);

    const input = byId("field-capture");
    assert(input instanceof HTMLInputElement, "The capture field is no input.");

    const typed = async (value: string, isExpanded: boolean): Promise<void> => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settleUntil(
        () => input.getAttribute("aria-expanded") === String(isExpanded)
      );
    };

    await typed("Write release notes @", true);
    const down = keydown("ArrowDown");
    input.dispatchEvent(down);
    await settleUntil(
      () =>
        input.getAttribute("aria-activedescendant") ===
        "field-capture-suggestion-guide"
    );

    expect(down.defaultPrevented).toBe(true);

    await typed("Write release notes fri +mem", false);
    const keys = [keydown("Enter"), keydown("ArrowUp"), keydown("ArrowDown")];

    for (const key of keys) {
      input.dispatchEvent(key);
    }

    await settle(30);

    expect(keys.map((key) => key.defaultPrevented)).toStrictEqual([
      false,
      false,
      false,
    ]);
    expect(input.value).toBe("Write release notes fri +mem");
  });
});
