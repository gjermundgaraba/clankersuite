import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Fields from "./fields.ts";

const update = (model: boolean) => ({ model });

const fieldsView = (isBusy: boolean, h: HtmlBuilder<never>) =>
  Fields.view(
    {
      body: [h.input([h.Type("text"), h.AriaLabel("Name")])],
      isBusy,
    },
    h
  );

describe("Fields", () => {
  it("is an unnamed group of fields, a column with the body's gap", () => {
    Scene.scene(
      { update, view: fieldsView },
      Scene.given(false),
      Scene.expect(Scene.role("group")).toHaveClass("stack"),
      Scene.expect(Scene.role("group")).toHaveClass("gap-m"),
      Scene.expect(Scene.role("group")).not.toHaveAttr("disabled"),
      Scene.expect(Scene.role("group")).not.toHaveAttr("aria-busy")
    );
  });

  it("disables every field at once and says it is busy while a save is in flight", () => {
    Scene.scene(
      { update, view: fieldsView },
      Scene.given(true),
      Scene.expect(Scene.role("group")).toHaveAttr("disabled"),
      Scene.expect(Scene.role("group")).toHaveAttr("aria-busy", "true")
    );
  });
});
