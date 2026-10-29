import { Focus } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as FormsExample from "./forms.ts";

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  FormsExample.Message.CompletedFocus()
);

const resolveSave = Story.Command.resolve(
  FormsExample.WaitForSave,
  FormsExample.Message.CompletedWaitForSave()
);

const filled: FormsExample.Model = {
  ...FormsExample.init(),
  name: "Field notes",
  hosts: "app.example.com",
  maybePlan: Option.some("Monthly"),
  password: "a sample password",
};

describe("Forms example", () => {
  it("lists what is wrong and moves the keyboard to the summary", () => {
    Story.story(
      FormsExample.update,
      Story.given(FormsExample.init()),
      Story.message(FormsExample.Message.SubmittedForm()),
      Story.Command.expectExact(Focus.Focus({ id: "sample-form-errors" })),
      resolveFocus,
      Story.model((model) => {
        expect(Array.map(model.errors, ({ message }) => message)).toStrictEqual(
          ["Enter the project's name.", "Enter a host.", "Enter a password."]
        );
        expect(model.isSaving).toBe(false);
      })
    );
  });

  it("saves, then rests so it can save again", () => {
    Story.story(
      FormsExample.update,
      Story.given({ ...filled, isPasswordShown: true }),
      Story.message(FormsExample.Message.SubmittedForm()),
      Story.Command.expectExact(FormsExample.WaitForSave()),
      Story.model((model) => {
        expect(model.isSaving).toBe(true);
      }),
      resolveSave,
      Story.model((model) => {
        expect(model.isSaving).toBe(false);
        expect(model.isPasswordShown).toBe(false);
        expect(model.errors).toStrictEqual([]);
      }),
      Story.message(FormsExample.Message.SubmittedForm()),
      Story.Command.expectExact(FormsExample.WaitForSave()),
      resolveSave
    );
  });

  it("ignores a second submit while the save is out", () => {
    Story.story(
      FormsExample.update,
      Story.given({ ...filled, isSaving: true }),
      Story.message(FormsExample.Message.SubmittedForm()),
      Story.Command.expectNone()
    );
  });
});
