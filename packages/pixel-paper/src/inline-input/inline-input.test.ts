import { Input as UiInput } from "@foldkit/ui";
import { Option } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { keydown, readDuringDispatch } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import * as InlineInput from "./inline-input.ts";
import { fieldKey, toWrite } from "./inline-input.ts";

const fresh = InlineInput.init({ id: "new-item" }).model;
const repeating = InlineInput.init({ id: "new-item", isRepeating: true }).model;

const ADDING = "";

const typed = (model: InlineInput.Model, text: string, replaced = ADDING) =>
  InlineInput.update(
    model,
    InlineInput.Message.UpdatedDraft({ value: text, replaced })
  ).model;

const errorId = UiInput.descriptionId("new-item");

describe("InlineInput update", () => {
  it("focuses and selects the field as an edit starts", () => {
    const started = InlineInput.init({ id: "new-item" });

    expect(started.commands?.map(({ name }) => name)).toStrictEqual([
      InlineInput.FocusField.name,
    ]);
  });

  it("ends on Enter without saving an untouched field", () => {
    Story.story(
      InlineInput.update,
      Story.given(fresh),
      Story.message(InlineInput.Message.PressedEnter()),
      Story.expectOutMessage(
        InlineInput.OutMessage.Ended({
          how: "Enter",
          maybeLastSavedId: Option.none(),
        })
      )
    );
  });

  it("ends without saving a draft that only restores the value it replaces", () => {
    Story.story(
      InlineInput.update,
      Story.given(typed(fresh, " Renew ", "Renew")),
      Story.message(InlineInput.Message.PressedEnter()),
      Story.expectOutMessage(
        InlineInput.OutMessage.Ended({
          how: "Enter",
          maybeLastSavedId: Option.none(),
        })
      )
    );
  });

  it("commits new text trimmed and holds while the save is out", () => {
    Story.story(
      InlineInput.update,
      Story.given(typed(fresh, "  Renew the certificate ", "Renew")),
      Story.message(InlineInput.Message.PressedEnter()),
      Story.expectOutMessage(
        InlineInput.OutMessage.Committed({ text: "Renew the certificate" })
      ),
      Story.model((model) => {
        expect(InlineInput.isSaving(model)).toBe(true);
      }),
      Story.message(
        InlineInput.Message.UpdatedDraft({
          value: "changed underneath",
          replaced: "Renew",
        })
      ),
      Story.message(InlineInput.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.maybeDraft).toStrictEqual(
          Option.some("  Renew the certificate ")
        );
        expect(InlineInput.isSaving(model)).toBe(true);
      })
    );
  });

  it("creates twice with Enter, then Escape ends with the item saved last", () => {
    const first = InlineInput.update(
      typed(repeating, "Draft the brief"),
      InlineInput.Message.PressedEnter()
    );

    expect(first.outMessage).toStrictEqual(
      InlineInput.OutMessage.Committed({ text: "Draft the brief" })
    );

    const firstSaved = InlineInput.succeeded(first.model, "item-1");
    expect(firstSaved.outMessage).toBeUndefined();
    expect(firstSaved.model.maybeDraft).toStrictEqual(Option.some(""));
    expect(InlineInput.isSaving(firstSaved.model)).toBe(false);

    const second = InlineInput.update(
      typed(firstSaved.model, "Send it"),
      InlineInput.Message.PressedEnter()
    );

    const secondSaved = InlineInput.succeeded(second.model, "item-2");

    const escaped = InlineInput.update(
      secondSaved.model,
      InlineInput.Message.PressedEscape()
    );

    expect(escaped.outMessage).toStrictEqual(
      InlineInput.OutMessage.Ended({
        how: "Escape",
        maybeLastSavedId: Option.some("item-2"),
      })
    );
  });

  it("ends as a blur when focus left while the save was out, and saves on blur without ending twice", () => {
    Story.story(
      InlineInput.update,
      Story.given(typed(repeating, "Call back")),
      Story.message(InlineInput.Message.PressedEnter()),
      Story.message(InlineInput.Message.BlurredField()),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(InlineInput.succeeded(model, "item-3").outMessage).toStrictEqual(
          InlineInput.OutMessage.Ended({
            how: "Blur",
            maybeLastSavedId: Option.some("item-3"),
          })
        );
      })
    );
  });

  it("keeps the draft and says why when the save is refused", () => {
    const saving = InlineInput.update(
      typed(fresh, "Renewed", "Renew"),
      InlineInput.Message.BlurredField()
    );

    const refused = InlineInput.failed(saving.model, "Titles must be shorter.");

    expect(saving.outMessage).toStrictEqual(
      InlineInput.OutMessage.Committed({ text: "Renewed" })
    );
    expect(InlineInput.isSaving(refused.model)).toBe(false);
    expect(refused.model.maybeDraft).toStrictEqual(Option.some("Renewed"));
    expect(InlineInput.maybeError(refused.model)).toStrictEqual(
      Option.some("Titles must be shorter.")
    );
    expect(
      InlineInput.maybeError(
        InlineInput.update(
          refused.model,
          InlineInput.Message.UpdatedDraft({
            value: "Renew it",
            replaced: "Renew",
          })
        ).model
      )
    ).toStrictEqual(Option.none());
  });

  it("lets go of the text without an error when the save fails for a reason told elsewhere", () => {
    const saving = InlineInput.update(
      typed(fresh, "Renewed", "Renew"),
      InlineInput.Message.PressedEnter()
    );

    const released = InlineInput.failed(saving.model);

    expect(InlineInput.isSaving(released.model)).toBe(false);
    expect(released.model.maybeDraft).toStrictEqual(Option.some("Renewed"));
    expect(InlineInput.maybeError(released.model)).toStrictEqual(Option.none());
  });

  it("ignores a late result and the blur of a field being removed", () => {
    const ended = InlineInput.update(
      fresh,
      InlineInput.Message.PressedEscape()
    ).model;

    expect(InlineInput.succeeded(ended, "item-9").model).toStrictEqual(ended);
    expect(InlineInput.failed(ended, "late").model).toStrictEqual(ended);
    expect(
      InlineInput.update(ended, InlineInput.Message.BlurredField()).outMessage
    ).toBeUndefined();
  });
});

describe("InlineInput keys", () => {
  it("takes Enter and Escape, leaving other, composing, modified and handled keys", () => {
    document.body.innerHTML = `<input id="new-item" />`;
    const field = byId("new-item");

    const press = (
      key: string,
      init: KeyboardEventInit = {},
      isHandled = false
    ) => readDuringDispatch(field, keydown(key, init), fieldKey, { isHandled });

    expect(press("Enter")).toStrictEqual(
      Option.some(InlineInput.Message.PressedEnter())
    );
    expect(press("Escape")).toStrictEqual(
      Option.some(InlineInput.Message.PressedEscape())
    );
    expect(press("a")).toStrictEqual(Option.none());
    expect(press("Enter", { isComposing: true })).toStrictEqual(Option.none());
    expect(press("Enter", { shiftKey: true })).toStrictEqual(Option.none());
    expect(press("Escape", { metaKey: true })).toStrictEqual(Option.none());
    expect(press("Escape", {}, true)).toStrictEqual(Option.none());
  });
});

const fieldView =
  (value: string) =>
  (model: InlineInput.Model, h: HtmlBuilder<InlineInput.Message>) =>
    h.div(
      [],
      [
        InlineInput.view(
          model,
          { value, label: "Rename Notes", placeholder: "Title…" },
          h
        ),
        InlineInput.errorView(model, h),
      ]
    );

const resolveKeys = Scene.Mount.resolve(
  InlineInput.BindFieldKeys,
  InlineInput.Message.PressedEscape()
);

describe("InlineInput view", () => {
  it("is a field named by its label that shows, and follows, the value while untouched", () => {
    Scene.scene(
      { update: InlineInput.update, view: fieldView("Notes") },
      Scene.given(fresh),
      Scene.expect(Scene.label("Rename Notes")).toHaveValue("Notes"),
      Scene.expect(Scene.label("Rename Notes")).toHaveClass("inline-input"),
      Scene.expect(Scene.label("Rename Notes")).not.toHaveAttr("aria-busy"),
      Scene.expect(Scene.label("Rename Notes")).not.toHaveAttr("aria-invalid"),
      resolveKeys
    );
    Scene.scene(
      {
        update: InlineInput.update,
        view: fieldView("Notes, renamed elsewhere"),
      },
      Scene.given(fresh),
      Scene.expect(Scene.label("Rename Notes")).toHaveValue(
        "Notes, renamed elsewhere"
      ),
      resolveKeys
    );
  });

  it("holds the field read-only and busy while the save is out", () => {
    const saving = InlineInput.update(
      typed(fresh, "Field notes", "Notes"),
      InlineInput.Message.BlurredField()
    ).model;

    Scene.scene(
      { update: InlineInput.update, view: fieldView("Notes") },
      Scene.given(saving),
      Scene.expect(Scene.label("Rename Notes")).toHaveAttr("aria-busy", "true"),
      Scene.expect(Scene.label("Rename Notes")).toHaveAttr("readOnly", "true"),
      Scene.expect(Scene.label("Rename Notes")).toHaveValue("Field notes"),
      resolveKeys
    );
  });

  it("marks a refused save invalid and points the field at the reason", () => {
    const refused = InlineInput.failed(
      InlineInput.update(
        typed(fresh, "Field notes", "Notes"),
        InlineInput.Message.PressedEnter()
      ).model,
      "That name is taken."
    ).model;

    Scene.scene(
      { update: InlineInput.update, view: fieldView("Notes") },
      Scene.given(refused),
      Scene.expect(Scene.label("Rename Notes")).toHaveAttr(
        "aria-invalid",
        "true"
      ),
      Scene.expect(Scene.label("Rename Notes")).toHaveAttr(
        "aria-describedby",
        errorId
      ),
      Scene.expect(Scene.role("alert")).toHaveId(errorId),
      Scene.expect(Scene.role("alert")).toContainText("That name is taken."),
      resolveKeys
    );
  });

  it("marks the field with the caller's own error and points it at the reason", () => {
    Scene.scene(
      {
        update: InlineInput.update,
        view: (model: InlineInput.Model, h: HtmlBuilder<InlineInput.Message>) =>
          h.div(
            [],
            [
              InlineInput.view(
                model,
                {
                  value: "",
                  label: "New item",
                  error: "Its project was deleted.",
                },
                h
              ),
              InlineInput.errorView(model, h, "Its project was deleted."),
            ]
          ),
      },
      Scene.given(fresh),
      Scene.expect(Scene.label("New item")).toHaveAttr("aria-invalid", "true"),
      Scene.expect(Scene.label("New item")).toHaveAttr(
        "aria-describedby",
        errorId
      ),
      Scene.expect(Scene.role("alert")).toHaveId(errorId),
      Scene.expect(Scene.role("alert")).toContainText(
        "Its project was deleted."
      ),
      resolveKeys
    );
  });

  it("prints a card's title at the title size", () => {
    Scene.scene(
      {
        update: InlineInput.update,
        view: (model: InlineInput.Model, h: HtmlBuilder<InlineInput.Message>) =>
          InlineInput.view(
            model,
            { value: "Notes", label: "Title", size: "Title" },
            h
          ),
      },
      Scene.given(fresh),
      Scene.expect(Scene.label("Title")).toHaveClass("title-edit"),
      resolveKeys
    );
  });
});

describe("toWrite", () => {
  it("writes new, non-empty text, trimmed", () => {
    expect(
      toWrite(Option.some("  Renew the certificate "), "Renew")
    ).toStrictEqual(Option.some("Renew the certificate"));
    expect(toWrite(Option.some("New item"), "")).toStrictEqual(
      Option.some("New item")
    );
  });

  it("writes nothing untouched, empty or unchanged", () => {
    expect(toWrite(Option.none(), "Renew")).toStrictEqual(Option.none());
    expect(toWrite(Option.some("   "), "Renew")).toStrictEqual(Option.none());
    expect(toWrite(Option.some(""), "")).toStrictEqual(Option.none());
    expect(toWrite(Option.some(" Renew "), "Renew")).toStrictEqual(
      Option.none()
    );
  });
});
