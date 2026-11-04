import { Focus } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { Message, SUMMARY_ID, Save, init, update } from "./form.ts";
import type { Model } from "./form.ts";

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  Message.CompletedFocus()
);

const resolveSave = Story.Command.resolve(Save, Message.CompletedSave());

const filled: Model = modifyFields(init().model, {
  name: () => "Field notes",
  hosts: () => "app.example.com",
  password: () => "a sample password",
});

describe("the form example", () => {
  it("lists what is wrong and moves the keyboard to the summary", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.SubmittedForm()),
      Story.Command.expectExact(Focus.Focus({ id: SUMMARY_ID })),
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
      update,
      Story.given(modifyFields(filled, { isPasswordShown: () => true })),
      Story.message(Message.SubmittedForm()),
      Story.Command.expectExact(Save()),
      Story.model((model) => {
        expect(model.isSaving).toBe(true);
      }),
      resolveSave,
      Story.model((model) => {
        expect(model.isSaving).toBe(false);
        expect(model.isPasswordShown).toBe(false);
        expect(model.errors).toStrictEqual([]);
      }),
      Story.message(Message.SubmittedForm()),
      Story.Command.expectExact(Save()),
      resolveSave
    );
  });

  it("ignores a second submit while the save is out", () => {
    Story.story(
      update,
      Story.given(modifyFields(filled, { isSaving: () => true })),
      Story.message(Message.SubmittedForm()),
      Story.Command.expectNone()
    );
  });
});
