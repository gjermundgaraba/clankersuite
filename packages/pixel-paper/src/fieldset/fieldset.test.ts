import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as FieldGrid from "../field-grid/field-grid.ts";
import * as Field from "../field/field.ts";
import * as Fields from "../fields/fields.ts";
import * as Fieldset from "./fieldset.ts";

const formView = (isBusy: boolean) => (_model: null, h: HtmlBuilder<string>) =>
  Fields.view(
    {
      isBusy,
      body: [
        FieldGrid.view(
          {
            body: [
              Field.view(
                {
                  id: "first",
                  label: "First",
                  value: "",
                  onInput: (value) => value,
                },
                h
              ),
              Field.view(
                {
                  id: "last",
                  label: "Last",
                  value: "",
                  onInput: (value) => value,
                },
                h
              ),
            ],
          },
          h
        ),
        Fieldset.view(
          {
            id: "notify",
            label: "Notify",
            help: "Who hears of it.",
            body: ["choices"],
          },
          h
        ),
        Fieldset.view({ id: "plain", label: "Plain", body: [] }, h),
        Fieldset.view(
          {
            id: "plan",
            label: "Plan",
            help: "Billed each month.",
            error: "Choose a plan.",
            body: ["choices"],
          },
          h
        ),
      ],
    },
    h
  );

describe("Fieldset, Fields and FieldGrid", () => {
  it("names a group by its legend and describes it by its error and its help line", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: formView(false) },
      Scene.given(null),
      Scene.expect(Scene.role("group", { name: "Notify" })).toHaveAttr(
        "aria-describedby",
        "notify-description"
      ),
      Scene.expect(Scene.selector("#notify-description")).toHaveText(
        "Who hears of it."
      ),
      Scene.expect(Scene.selector("#notify legend")).toHaveClass("field-label"),
      Scene.expect(Scene.role("group", { name: "Plain" })).not.toHaveAttr(
        "aria-describedby"
      ),
      Scene.expect(Scene.role("group", { name: "Plan" })).toHaveAttr(
        "aria-describedby",
        "plan-error plan-description"
      ),
      Scene.expect(Scene.selector("#plan-error.field-error")).toHaveText(
        "Choose a plan."
      ),
      Scene.expect(Scene.selector(".field-grid #first")).toExist(),
      Scene.expect(Scene.selector("fieldset.stack")).not.toHaveAttr(
        "aria-busy"
      ),
      Scene.expect(Scene.selector("fieldset.stack")).toBeEnabled()
    );
  });

  it("disables every control at once while a save is in flight, and says it is busy", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: formView(true) },
      Scene.given(null),
      Scene.expect(Scene.selector("fieldset.stack")).toHaveAttr(
        "aria-busy",
        "true"
      ),
      Scene.expect(Scene.selector("fieldset.stack")).toBeDisabled()
    );
  });
});
