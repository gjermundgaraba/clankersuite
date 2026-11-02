import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as Card from "./card.ts";

const Message = defineMessageUnion({
  ClickedClose: {},
  ClickedRetry: {},
  SubmittedForm: {},
});

type Message = typeof Message.Type;

const Model = Schema.Struct({
  closeCount: Schema.Finite,
  retryCount: Schema.Finite,
  submitCount: Schema.Finite,
});

type Model = typeof Model.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    ClickedClose: () => ({
      model: modifyFields(model, { closeCount: (count) => count + 1 }),
    }),
    ClickedRetry: () => ({
      model: modifyFields(model, { retryCount: (count) => count + 1 }),
    }),
    SubmittedForm: () => ({
      model: modifyFields(model, { submitCount: (count) => count + 1 }),
    }),
  });

const cardView =
  (toConfig: (h: HtmlBuilder<Message>) => Partial<Card.ViewConfig<Message>>) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
      [],
      [
        Card.view(
          {
            title: "Rename",
            body: ["Its contents stay as they are."],
            actions: [h.button([h.Type("submit")], ["save"])],
            ...toConfig(h),
          },
          h
        ),
        h.output(
          [h.Class("counts")],
          [`${model.closeCount} ${model.submitCount}`]
        ),
      ]
    );

const given = Scene.given<Model>({
  closeCount: 0,
  retryCount: 0,
  submitCount: 0,
});

describe("Card", () => {
  it("heads its body with the title as a heading, and closes from a named close glyph", () => {
    Scene.scene(
      {
        update,
        view: cardView((h) => ({
          closeAttributes: [h.OnClick(Message.ClickedClose())],
          meta: "draft",
        })),
      },
      given,
      Scene.expect(Scene.role("heading", { name: "Rename" })).toExist(),
      Scene.expect(Scene.selector(".card-tb .meta")).toHaveText("draft"),
      Scene.click(Scene.role("button", { name: "Close" })),
      Scene.expect(Scene.selector(".counts")).toHaveText("1 0")
    );
  });

  it("prints no close glyph unless asked", () => {
    Scene.scene(
      { update, view: cardView(() => ({})) },
      given,
      Scene.expect(Scene.role("button", { name: "Close" })).toBeAbsent()
    );
  });

  it("narrows, and holds its actions in their own span", () => {
    Scene.scene(
      { update, view: cardView(() => ({ isNarrow: true })) },
      given,
      Scene.expect(Scene.selector(".card")).toHaveClass("narrow"),
      Scene.expect(Scene.selector(".card-actions .card-acts")).toExist()
    );
  });
});

const formView =
  (isBusy: boolean, isSubmitDisabled = false) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
      [],
      [
        Card.formView(
          {
            id: "rename",
            title: "Rename",
            closeAttributes: [h.OnClick(Message.ClickedClose())],
            cancel: "cancel",
            submit: "save",
            isBusy,
            isSubmitDisabled,
            lead: [h.span([h.Class("lead")], ["draft"])],
            notices: [
              h.button(
                [h.Type("button"), h.OnClick(Message.ClickedRetry())],
                ["retry"]
              ),
            ],
            onSubmit: Message.SubmittedForm(),
            body: [h.input([h.Id("name"), h.AriaLabel("Name")])],
          },
          h
        ),
        h.output(
          [h.Class("counts")],
          [`${model.closeCount} ${model.retryCount} ${model.submitCount}`]
        ),
      ]
    );

describe("Card form", () => {
  it("is a form named by its title, sending its Message, with cancel before the submit", () => {
    Scene.scene(
      { update, view: formView(false) },
      given,
      Scene.expect(Scene.role("form", { name: "Rename" })).toHaveClass("card"),
      Scene.expect(Scene.role("button", { name: "save" })).toHaveId(
        Card.submitId("rename")
      ),
      Scene.expect(Scene.role("button", { name: "save" })).toHaveAttr(
        "type",
        "submit"
      ),
      Scene.expect(Scene.role("button", { name: "save" })).toHaveClass(
        "primary"
      ),
      Scene.expect(Scene.selector(".card-actions .lead")).toHaveText("draft"),
      Scene.expect(
        Scene.first(Scene.all.selector(".card-acts button"))
      ).toHaveText("cancel"),
      Scene.click(Scene.role("button", { name: "cancel" })),
      Scene.click(Scene.role("button", { name: "Close" })),
      Scene.submit(Scene.role("form", { name: "Rename" })),
      Scene.expect(Scene.selector(".counts")).toHaveText("2 0 1")
    );
  });

  it("holds the submit, the close glyph, cancel and the fields with one flag", () => {
    Scene.scene(
      { update, view: formView(true) },
      given,
      Scene.expect(Scene.role("button", { name: "save" })).toHaveAttr(
        "aria-busy",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "save" })).toHaveAttr(
        "type",
        "button"
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).not.toHaveHandler(
        "click"
      ),
      Scene.expect(Scene.role("button", { name: "Close" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "Close" })).not.toHaveAttr(
        "disabled"
      ),
      Scene.expect(Scene.role("button", { name: "Close" })).not.toHaveHandler(
        "click"
      ),
      Scene.expect(Scene.selector("fieldset")).toHaveAttr("aria-busy", "true"),
      Scene.expect(Scene.selector("fieldset")).toHaveAttr("disabled"),
      Scene.expect(Scene.selector("fieldset button")).toBeAbsent(),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.expect(Scene.selector(".counts")).toHaveText("0 1 0")
    );
  });

  it("holds the submit alone while there is nothing to send", () => {
    Scene.scene(
      { update, view: formView(false, true) },
      given,
      Scene.expect(Scene.role("button", { name: "save" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "save" })).toHaveAttr(
        "type",
        "button"
      ),
      Scene.expect(Scene.role("button", { name: "save" })).not.toHaveAttr(
        "aria-busy"
      ),
      Scene.expect(Scene.selector("fieldset")).not.toHaveAttr("disabled"),
      Scene.click(Scene.role("button", { name: "cancel" })),
      Scene.expect(Scene.selector(".counts")).toHaveText("1 0 0")
    );
  });
});
