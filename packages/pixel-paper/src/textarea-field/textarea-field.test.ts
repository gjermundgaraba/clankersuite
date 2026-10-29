import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as TextareaField from "./textarea-field.ts";

const Model = Schema.Struct({
  notes: Schema.String,
  isInvalid: Schema.Boolean,
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({ UpdatedNotes: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    UpdatedNotes: ({ value }) => ({
      model: modifyFields(model, { notes: () => value }),
    }),
  });

const fieldView =
  (help: string | undefined) => (model: Model, h: HtmlBuilder<Message>) =>
    TextareaField.view(
      {
        id: "notes",
        label: "Notes",
        value: model.notes,
        onInput: (value) => Message.UpdatedNotes({ value }),
        error: model.isInvalid ? "Give it a name." : undefined,
        rows: 6,
        ...(help === undefined ? {} : { help }),
      },
      h
    );

const textarea = Scene.label("Notes");

describe("TextareaField", () => {
  it("is named by its label, described by its help line, plain by default, and typed into", () => {
    Scene.scene(
      { update, view: fieldView("Markdown supported.") },
      Scene.given<Model>({ notes: "", isInvalid: false }),
      Scene.expect(textarea).toHaveAttr("rows", "6"),
      Scene.expect(textarea).toHaveAttr("aria-describedby"),
      Scene.expect(Scene.selector(".field-help")).toHaveText(
        "Markdown supported."
      ),
      Scene.expect(textarea).not.toHaveAttr("aria-invalid"),
      Scene.expect(textarea).not.toHaveAttr("aria-required"),
      Scene.expect(Scene.selector(".field")).not.toHaveClass("mono"),
      Scene.type(textarea, "Call the bank."),
      Scene.expect(textarea).toHaveValue("Call the bank.")
    );
  });

  it("says why it is invalid, described by its error alone without help", () => {
    Scene.scene(
      { update, view: fieldView(undefined) },
      Scene.given<Model>({ notes: "", isInvalid: true }),
      Scene.expect(textarea).toHaveAttr("aria-invalid", "true"),
      Scene.expect(textarea).toHaveAttr("aria-describedby", "notes-error"),
      Scene.expect(Scene.selector(".field-error")).toHaveText(
        "Give it a name."
      ),
      Scene.expect(Scene.selector(".field-help")).toBeAbsent()
    );
  });

  it("says it is required, sets in monospace, and takes further attributes", () => {
    Scene.scene(
      {
        update,
        view: (model: Model, h: HtmlBuilder<Message>) =>
          TextareaField.view(
            {
              id: "hosts",
              label: "Hosts",
              value: model.notes,
              onInput: (value) => Message.UpdatedNotes({ value }),
              isRequired: true,
              isMono: true,
              textareaAttributes: [h.Spellcheck(false)],
            },
            h
          ),
      },
      Scene.given<Model>({ notes: "", isInvalid: false }),
      Scene.expect(Scene.label("Hosts")).toHaveAttr("aria-required", "true"),
      Scene.expect(Scene.label("Hosts")).toHaveAttr("spellcheck", "false"),
      Scene.expect(Scene.selector(".field")).toHaveClass("mono")
    );
  });

  it("is described by its error, then its help", () => {
    Scene.scene(
      { update, view: fieldView("Markdown supported.") },
      Scene.given<Model>({ notes: "", isInvalid: true }),
      Scene.expect(textarea).toHaveAttr(
        "aria-describedby",
        "notes-error notes-description"
      )
    );
  });
});
