import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as Field from "./field.ts";

const Model = Schema.Struct({ name: Schema.String, isInvalid: Schema.Boolean });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ UpdatedName: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    UpdatedName: ({ value }) => ({
      model: modifyFields(model, { name: () => value }),
    }),
  });

const fieldView =
  (help: string | undefined) => (model: Model, h: HtmlBuilder<Message>) =>
    Field.view(
      {
        id: "file-name",
        label: "Name",
        value: model.name,
        onInput: (value) => Message.UpdatedName({ value }),
        error: model.isInvalid ? "Give it a name." : undefined,
        isMono: true,
        ...(help === undefined ? {} : { help }),
      },
      h
    );

const input = Scene.label("Name");

describe("Field", () => {
  it("is named by its label, described by its help line, and typed into", () => {
    Scene.scene(
      { update, view: fieldView("The name it is listed under.") },
      Scene.given<Model>({ name: "notes.md", isInvalid: false }),
      Scene.expect(input).toHaveValue("notes.md"),
      Scene.expect(input).toHaveAttr("aria-describedby"),
      Scene.expect(Scene.selector(".field-help")).toHaveText(
        "The name it is listed under."
      ),
      Scene.expect(input).not.toHaveAttr("aria-invalid"),
      Scene.expect(input).not.toHaveAttr("aria-required"),
      Scene.expect(Scene.selector(".field")).toHaveClass("mono"),
      Scene.type(input, "field-notes.md"),
      Scene.expect(input).toHaveValue("field-notes.md")
    );
  });

  it("takes the input's type, a date for the browser's date control, always boxed", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          Field.view(
            {
              id: "due-on",
              label: "Due",
              type: "date",
              value: model.name,
              onInput: (value) => Message.UpdatedName({ value }),
              inputAttributes: [h.Type("text")],
            },
            h
          ),
      },
      Scene.given<Model>({ name: "2026-10-12", isInvalid: false }),
      Scene.expect(Scene.label("Due")).toHaveAttr("type", "date"),
      Scene.expect(Scene.label("Due")).toHaveValue("2026-10-12"),
      Scene.expect(Scene.selector(".field.boxed")).toExist()
    );
  });

  it("says it is required when the form is not sent without it", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          Field.view(
            {
              id: "file-name",
              label: "Name",
              value: model.name,
              onInput: (value) => Message.UpdatedName({ value }),
              isRequired: true,
            },
            h
          ),
      },
      Scene.given<Model>({ name: "", isInvalid: false }),
      Scene.expect(input).toHaveAttr("aria-required", "true")
    );
  });

  it("keeps a hidden label for screen readers, still naming the input", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          Field.view(
            {
              id: "address",
              label: "Address",
              value: model.name,
              onInput: (value) => Message.UpdatedName({ value }),
              isLabelHidden: true,
            },
            h
          ),
      },
      Scene.given<Model>({ name: "https://example.com/", isInvalid: false }),
      Scene.expect(Scene.role("textbox", { name: "Address" })).toHaveValue(
        "https://example.com/"
      ),
      Scene.expect(Scene.selector(".field label")).toHaveClass("sr-only")
    );
  });

  it("shows its label unless it is hidden", () => {
    Scene.scene(
      { update, view: fieldView(undefined) },
      Scene.given<Model>({ name: "", isInvalid: false }),
      Scene.expect(Scene.selector(".field label")).not.toHaveClass("sr-only")
    );
  });

  it("says why it is invalid, described by its error alone without help", () => {
    Scene.scene(
      { update, view: fieldView(undefined) },
      Scene.given<Model>({ name: "", isInvalid: true }),
      Scene.expect(input).toHaveAttr("aria-invalid", "true"),
      Scene.expect(input).toHaveAttr("aria-describedby", "file-name-error"),
      Scene.expect(Scene.selector("#file-name-error.field-error")).toHaveText(
        "Give it a name."
      ),
      Scene.expect(Scene.selector(".field-help")).toBeAbsent()
    );
  });

  it("is described by its error, then its help", () => {
    Scene.scene(
      { update, view: fieldView("The name it is listed under.") },
      Scene.given<Model>({ name: "", isInvalid: true }),
      Scene.expect(input).toHaveAttr(
        "aria-describedby",
        "file-name-error file-name-description"
      )
    );
  });

  it("is described by nothing without help or an error", () => {
    Scene.scene(
      { update, view: fieldView(undefined) },
      Scene.given<Model>({ name: "", isInvalid: false }),
      Scene.expect(input).not.toHaveAttr("aria-describedby"),
      Scene.expect(Scene.selector(".field-error")).toBeAbsent()
    );
  });
});
