import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as SelectField from "./select-field.ts";

const Model = Schema.Struct({ area: Schema.String, isInvalid: Schema.Boolean });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ ChangedArea: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    ChangedArea: ({ value }) => ({
      model: modifyFields(model, { area: () => value }),
    }),
  });

const OPTIONS: SelectField.ViewConfig<Message>["options"] = [
  { value: "inbox", label: "Inbox" },
  {
    key: "work",
    label: "Work",
    options: [
      { value: "work", label: "Work" },
      { value: "launch", label: "Launch", isDisabled: true },
    ],
  },
];

const fieldView =
  (config: Readonly<{ help?: string; isRequired?: boolean }>) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    SelectField.view(
      {
        id: "area",
        label: "Area",
        value: model.area,
        onChange: (value) => Message.ChangedArea({ value }),
        options: OPTIONS,
        error: model.isInvalid ? "Choose an area." : undefined,
        ...config,
      },
      h
    );

const select = Scene.label("Area");

describe("SelectField", () => {
  it("is named by its label, described by its help line, and lists its groups", () => {
    Scene.scene(
      { update, view: fieldView({ help: "Where it is filed." }) },
      Scene.given<Model>({ area: "work", isInvalid: false }),
      Scene.expect(select).toHaveValue("work"),
      Scene.expect(select).toHaveAttr("aria-describedby"),
      Scene.expect(Scene.selector(".field-help")).toHaveText(
        "Where it is filed."
      ),
      Scene.expect(
        Scene.selector('optgroup[label="Work"] option[value="launch"]')
      ).toHaveAttr("disabled"),
      Scene.expect(select).not.toHaveAttr("aria-invalid"),
      Scene.expect(select).not.toHaveAttr("aria-required"),
      Scene.change(select, "inbox"),
      Scene.expect(select).toHaveValue("inbox")
    );
  });

  it("says it is required, and why it is invalid, described by its error alone without help", () => {
    Scene.scene(
      { update, view: fieldView({ isRequired: true }) },
      Scene.given<Model>({ area: "inbox", isInvalid: true }),
      Scene.expect(select).toHaveAttr("aria-required", "true"),
      Scene.expect(select).toHaveAttr("aria-invalid", "true"),
      Scene.expect(select).toHaveAttr("aria-describedby", "area-error"),
      Scene.expect(Scene.selector(".field-error")).toHaveText(
        "Choose an area."
      ),
      Scene.expect(Scene.selector(".field-help")).toBeAbsent()
    );
  });

  it("is described by its error, then its help", () => {
    Scene.scene(
      { update, view: fieldView({ help: "Where it is filed." }) },
      Scene.given<Model>({ area: "inbox", isInvalid: true }),
      Scene.expect(select).toHaveAttr(
        "aria-describedby",
        "area-error area-description"
      )
    );
  });
});
