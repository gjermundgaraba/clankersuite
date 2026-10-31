import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as MarkdownEditor from "./markdown-editor.ts";

const Model = Schema.Struct({ brief: Schema.String });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ UpdatedBrief: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    UpdatedBrief: ({ value }) => ({
      model: modifyFields(model, { brief: () => value }),
    }),
  });

const fieldView =
  (extra: Partial<MarkdownEditor.ViewConfig<Message>>) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    MarkdownEditor.view(
      {
        id: "brief",
        label: "Brief",
        value: model.brief,
        onInput: (value) => Message.UpdatedBrief({ value }),
        ...extra,
      },
      h
    );

const textbox = Scene.role("textbox", { name: "Brief" });
const host = Scene.selector(MarkdownEditor.spec.tag);

describe("MarkdownEditor", () => {
  it("is a textbox named by its label, inside the host, opening at its rows", () => {
    Scene.scene(
      { update, view: fieldView({ rows: 6 }) },
      Scene.given<Model>({ brief: "# Plan" }),
      Scene.expect(host).toExist(),
      Scene.expect(textbox).toHaveValue("# Plan"),
      Scene.expect(textbox).toHaveAttr("rows", "6"),
      Scene.expect(textbox).not.toHaveAttr("aria-required")
    );
  });

  it("is described by its help line", () => {
    Scene.scene(
      { update, view: fieldView({ help: "Markdown supported." }) },
      Scene.given<Model>({ brief: "" }),
      Scene.expect(textbox).toHaveAttr("aria-describedby"),
      Scene.expect(Scene.selector(".field-help")).toHaveText(
        "Markdown supported."
      )
    );
  });

  it("says why it is invalid, and that it is required", () => {
    Scene.scene(
      {
        update,
        view: fieldView({ error: "Give it a brief.", isRequired: true }),
      },
      Scene.given<Model>({ brief: "" }),
      Scene.expect(textbox).toHaveAttr("aria-invalid", "true"),
      Scene.expect(textbox).toHaveAttr("aria-describedby", "brief-error"),
      Scene.expect(textbox).toHaveAttr("aria-required", "true"),
      Scene.expect(Scene.selector(".field-error")).toHaveText(
        "Give it a brief."
      )
    );
  });

  it("hands typing in its textarea to onInput", () => {
    Scene.scene(
      { update, view: fieldView({}) },
      Scene.given<Model>({ brief: "" }),
      Scene.type(textbox, "Call the bank."),
      Scene.expect(textbox).toHaveValue("Call the bank.")
    );
  });

  it("hands an edit from the element to onInput", () => {
    Scene.scene(
      { update, view: fieldView({}) },
      Scene.given<Model>({ brief: "" }),
      Scene.CustomElement.emit(MarkdownEditor.spec, host, "value-change", {
        value: "Edited in place",
      }),
      Scene.expect(textbox).toHaveValue("Edited in place")
    );
  });
});
