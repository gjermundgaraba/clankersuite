import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { disposeEmbedded, embed } from "../test/embed.ts";
import { keydown } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import { settle, settleUntil } from "../test/settle.ts";
import * as TitleField from "./title-field.ts";

const Model = Schema.Struct({
  title: Schema.String,
  saved: Schema.String,
  enters: Schema.Finite,
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  TypedTitle: { value: Schema.String },
  PressedEnter: {},
  GotTitleFieldMessage: { message: TitleField.Message },
});

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    TypedTitle: ({ value }) => ({
      model: modifyFields(model, { title: () => value }),
    }),
    PressedEnter: () => ({
      model: modifyFields(model, {
        saved: () => model.title,
        enters: (enters) => enters + 1,
      }),
    }),
    GotTitleFieldMessage: () => ({ model }),
  });

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      TitleField.view(
        {
          id: "title",
          label: "Title",
          value: model.title,
          onInput: (value) => Message.TypedTitle({ value }),
          onEnter: Message.PressedEnter(),
          toParentMessage: (message) =>
            Message.GotTitleFieldMessage({ message }),
        },
        h
      ),
      h.p([], [`Saved: ${model.saved}`]),
      h.p([h.Id("enters")], [`Enters: ${model.enters}`]),
    ]
  );

const given = Scene.given({ title: "Book dentist", saved: "", enters: 0 });

const title = Scene.role("textbox", { name: "Title" });

const resolveKeys = Scene.Mount.resolve(
  { name: TitleField.BindTitleKeys.name },
  Message.GotTitleFieldMessage({
    message: TitleField.Message.CompletedBindTitleKeys(),
  })
);

describe("TitleField", () => {
  it("is a one-line textbox named by its label, holding the title it prints", () => {
    Scene.scene(
      { update, view },
      given,
      Scene.expect(title).toHaveValue("Book dentist"),
      Scene.expect(title).toHaveAttr("rows", "1"),
      Scene.expect(title).toHaveClass("gg-title-field"),
      resolveKeys,
      Scene.expect(Scene.text("Enters: 0")).toExist()
    );
  });

  it("sends each edit", () => {
    Scene.scene(
      { update, view },
      given,
      resolveKeys,
      Scene.type(title, "Book the dentist"),
      Scene.expect(title).toHaveValue("Book the dentist"),
      Scene.expect(Scene.text("Enters: 0")).toExist()
    );
  });

  it("turns a pasted line break into a space, so the title stays one line", () => {
    Scene.scene(
      { update, view },
      given,
      resolveKeys,
      Scene.type(title, "Book the dentist\nand the\r\nhygienist"),
      Scene.expect(title).toHaveValue("Book the dentist and the hygienist")
    );
  });
});

describe("TitleField's Enter", () => {
  afterEach(disposeEmbedded);

  it("sends onEnter for a plain Enter, its default prevented, and leaves an IME's or a modified one", async () => {
    embed({
      Model,
      init: () => ({ model: { title: "Book dentist", saved: "", enters: 0 } }),
      update,
      view,
    });
    await settleUntil(() => document.querySelector("#title") !== null);

    const field = byId("title");
    const composing = keydown("Enter", { isComposing: true });
    const shifted = keydown("Enter", { shiftKey: true });
    field.dispatchEvent(composing);
    field.dispatchEvent(shifted);
    await settle(30);

    expect(byId("enters").textContent).toBe("Enters: 0");

    const plain = keydown("Enter");
    field.dispatchEvent(plain);
    await settleUntil(() => byId("enters").textContent === "Enters: 1");

    expect([
      composing.defaultPrevented,
      shifted.defaultPrevented,
      plain.defaultPrevented,
    ]).toStrictEqual([false, false, true]);
  });
});
