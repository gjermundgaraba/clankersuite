import { RadioGroup as UiRadioGroup } from "@foldkit/ui";
import { Scene } from "foldkit";
import { describe, it } from "vite-plus/test";

import { init, update, view } from "./plan.ts";

const monthly = Scene.role("radio", { name: "monthly" });
const yearly = Scene.role("radio", { name: "yearly" });

const focusOption = Scene.Command.resolve(
  UiRadioGroup.FocusOption,
  UiRadioGroup.Message.CompletedFocusOption()
);

describe("the plan example", () => {
  it("checks the plan the reader picks, and only that one", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(monthly).toHaveAttr("aria-checked", "false"),
      Scene.expect(yearly).toHaveAttr("aria-checked", "false"),
      Scene.click(yearly),
      focusOption,
      Scene.expect(yearly).toHaveAttr("aria-checked", "true"),
      Scene.click(monthly),
      focusOption,
      Scene.expect(monthly).toHaveAttr("aria-checked", "true"),
      Scene.expect(yearly).toHaveAttr("aria-checked", "false")
    );
  });
});
