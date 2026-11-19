import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as PropsList from "./props-list.ts";

describe("PropsList", () => {
  it("prints each property as a term, its value, and its controls", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          PropsList.view(
            {
              items: [
                { label: "Region", value: ["eu-north"] },
                {
                  label: "Key",
                  value: ["pk_live_4f2a"],
                  isCode: true,
                  actions: [h.button([], ["copy"])],
                },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expectAll(Scene.all.selector("dl.gg-props dt")).toHaveCount(2),
      Scene.expect(
        Scene.first(Scene.all.selector("dl.gg-props dt"))
      ).toHaveText("Region"),
      Scene.expect(Scene.selector("dd code")).toHaveText("pk_live_4f2a"),
      Scene.expect(Scene.selector("dd.gg-acts button")).toHaveText("copy")
    );
  });
});

type DateModel = string;

const dateView = (model: DateModel, h: HtmlBuilder<string>) =>
  PropsList.dateView(
    {
      id: "deadline",
      label: "Deadline",
      value: model,
      shown: model === "" ? "None" : "Sat 21 Nov",
      onChange: (value) => value,
      toParentMessage: () => model,
    },
    h
  );

const resolvePicker = (model: DateModel) =>
  Scene.Mount.resolve({ name: PropsList.BindDatePicker.name }, model);

describe("PropsList date", () => {
  it("names its button with the label and what it prints, says it opens a picker, and reports the day picked", () => {
    Scene.scene(
      {
        update: (_model: DateModel, message: string) => ({ model: message }),
        view: dateView,
      },
      Scene.given<DateModel>(""),
      resolvePicker(""),
      Scene.expect(Scene.role("button", { name: "Deadline, None" })).toHaveText(
        "None"
      ),
      Scene.expect(Scene.role("button", { name: "Deadline, None" })).toHaveAttr(
        "aria-haspopup",
        "dialog"
      ),
      Scene.change(Scene.selector(".gg-prop-date input"), "2026-11-21"),
      Scene.expect(
        Scene.role("button", { name: "Deadline, Sat 21 Nov" })
      ).toExist(),
      Scene.expect(Scene.selector(".gg-prop-date input")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });
});
