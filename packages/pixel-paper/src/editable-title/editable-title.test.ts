import { Option } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { Focus } from "../focus/focus.ts";
import * as InlineInput from "../inline-input/inline-input.ts";
import * as EditableTitle from "./editable-title.ts";

const resting = EditableTitle.init({ id: "notes" });

const editing = EditableTitle.update(
  resting,
  EditableTitle.Message.ClickedTitle()
).model;

const edit = (message: InlineInput.Message) =>
  EditableTitle.Message.GotEditMessage({ message });

describe("EditableTitle update", () => {
  it("opens the field, focused, on a click", () => {
    Story.story(
      EditableTitle.update,
      Story.given(resting),
      Story.message(EditableTitle.Message.ClickedTitle()),
      Story.model((model) => {
        expect(Option.isSome(model.maybeEdit)).toBe(true);
      }),
      Story.Command.resolve(
        InlineInput.FocusField({ id: "notes-field" }),
        InlineInput.Message.CompletedFocusField()
      )
    );
  });

  it("asks to save new text, and puts focus back on the title when the save lands", () => {
    Story.story(
      EditableTitle.update,
      Story.given(editing),
      Story.message(
        edit(
          InlineInput.Message.UpdatedDraft({
            value: "Field notes",
            replaced: "Notes",
          })
        )
      ),
      Story.message(edit(InlineInput.Message.PressedEnter())),
      Story.expectOutMessage(
        EditableTitle.OutMessage.Committed({ text: "Field notes" })
      ),
      Story.model((model) => {
        const saved = EditableTitle.succeeded(model);
        expect(Option.isSome(saved.model.maybeEdit)).toBe(false);
        expect(saved.commands?.map(({ name }) => name)).toStrictEqual([
          Focus.name,
        ]);
      })
    );
  });

  it("leaves focus where the reader put it when the edit ends by leaving the field", () => {
    Story.story(
      EditableTitle.update,
      Story.given(editing),
      Story.message(edit(InlineInput.Message.BlurredField())),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(Option.isSome(model.maybeEdit)).toBe(false);
      }),
      Story.Command.expectNone()
    );
  });

  it("keeps the field open with its text when the save is refused", () => {
    const saving = EditableTitle.update(
      EditableTitle.update(
        editing,
        edit(
          InlineInput.Message.UpdatedDraft({
            value: "Notes 2",
            replaced: "Notes",
          })
        )
      ).model,
      edit(InlineInput.Message.PressedEnter())
    ).model;

    expect(
      Option.isSome(EditableTitle.failed(saving, "Taken.").model.maybeEdit)
    ).toBe(true);
  });
});

const titleView = (
  model: EditableTitle.Model,
  h: HtmlBuilder<EditableTitle.Message>
) => EditableTitle.view(model, { value: "Notes" }, h);

describe("EditableTitle view", () => {
  it("is a button with the title's words, then a field named Title", () => {
    Scene.scene(
      { update: EditableTitle.update, view: titleView },
      Scene.given(resting),
      Scene.expect(Scene.role("button", { name: "Notes" })).toHaveClass(
        "title-display"
      ),
      Scene.click(Scene.role("button", { name: "Notes" })),
      Scene.Command.resolve(
        InlineInput.FocusField,
        InlineInput.Message.CompletedFocusField()
      ),
      Scene.Mount.resolve(
        InlineInput.BindFieldKeys,
        InlineInput.Message.PressedEnter()
      ),
      Scene.Command.resolve(Focus, EditableTitle.Message.CompletedFocus()),
      Scene.Mount.expectEnded(InlineInput.BindFieldKeys),
      Scene.expect(Scene.role("button", { name: "Notes" })).toExist()
    );
  });

  it("prints the field at the title size", () => {
    Scene.scene(
      { update: EditableTitle.update, view: titleView },
      Scene.given(editing),
      Scene.expect(Scene.label("Title")).toHaveClass("title-edit"),
      Scene.expect(Scene.label("Title")).toHaveValue("Notes"),
      Scene.Mount.resolve(
        InlineInput.BindFieldKeys,
        InlineInput.Message.PressedEscape()
      ),
      Scene.Command.resolve(Focus, EditableTitle.Message.CompletedFocus()),
      Scene.Mount.expectEnded(InlineInput.BindFieldKeys)
    );
  });
});
