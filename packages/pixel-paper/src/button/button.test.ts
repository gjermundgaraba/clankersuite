import { Schema } from "effect";
import { Scene } from "foldkit";
import type { Update } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as Button from "./button.ts";

const SendState = Schema.Literals(["Rest", "Busy", "Done"]);

const Model = Schema.Struct({ sendState: SendState });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ ClickedSend: {} });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSend: () => ({
      model: modifyFields(model, { sendState: () => "Busy" }),
    }),
  });

const sendView = (model: Model, h: HtmlBuilder<Message>) =>
  Button.view(
    {
      label: "send",
      variant: "Primary",
      glyph: "send",
      onClick: Message.ClickedSend(),
      isBusy: model.sendState === "Busy",
      done: { isDone: model.sendState === "Done", label: "sent" },
      keyHint: { keys: "Mod+Enter", platform: "Other" },
    },
    h
  );

const button = Scene.role("button");

const submitView =
  (isBusy: boolean) => (_model: Model, h: HtmlBuilder<Message>) =>
    Button.view({ label: "save", type: "submit", isBusy }, h);

describe("Button", () => {
  it("prints its variant and sends its Message", () => {
    Scene.scene(
      { update, view: sendView },
      Scene.given({ sendState: "Rest" }),
      Scene.expect(button).toHaveClass("btn"),
      Scene.expect(button).toHaveClass("primary"),
      Scene.expect(button).toHaveAttr("type", "button"),
      Scene.expect(button).not.toHaveAttr("aria-disabled"),
      Scene.expect(button).not.toHaveAttr("aria-busy"),
      Scene.expect(Scene.selector(".key-hint")).toHaveText("Ctrl+Enter"),
      Scene.click(button),
      Scene.expect(Scene.selector(".cursor")).toExist()
    );
  });

  it("holds while busy and says so: unavailable, focusable, without a click handler", () => {
    Scene.scene(
      { update, view: sendView },
      Scene.given({ sendState: "Busy" }),
      Scene.expect(button).toHaveAttr("aria-busy", "true"),
      Scene.expect(button).toHaveAttr("aria-disabled", "true"),
      Scene.expect(button).not.toHaveAttr("disabled"),
      Scene.expect(button).not.toHaveHandler("click"),
      Scene.expect(Scene.selector(".cursor")).toExist()
    );
  });

  it("prints done in ink with the check and the done word, keeping both words", () => {
    Scene.scene(
      { update, view: sendView },
      Scene.given({ sendState: "Done" }),
      Scene.expect(button).toHaveClass("done"),
      Scene.expect(button).not.toHaveClass("primary"),
      Scene.expect(button).toHaveAttr("aria-disabled", "true"),
      Scene.expect(Scene.selector(".btn-words")).toHaveText("sendsent"),
      Scene.expect(Scene.selector(".btn-words span[aria-hidden]")).toHaveText(
        "send"
      ),
      Scene.expect(Scene.selector(".key-hint")).toBeAbsent(),
      Scene.expect(button).not.toHaveAttr("aria-busy"),
      Scene.expect(Scene.selector(".cursor")).toBeAbsent()
    );
  });

  it("stays in the keyboard when disabled, as @foldkit/ui's Button does", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          Button.view(
            {
              label: "publish",
              onClick: Message.ClickedSend(),
              isDisabled: true,
            },
            h
          ),
      },
      Scene.given({ sendState: "Rest" }),
      Scene.expect(button).toHaveAttr("aria-disabled", "true"),
      Scene.expect(button).not.toHaveAttr("disabled"),
      Scene.expect(button).not.toHaveHandler("click")
    );
  });

  it("submits nothing while held: a held submit button is a plain button", () => {
    Scene.scene(
      { update, view: submitView(false) },
      Scene.given({ sendState: "Rest" }),
      Scene.expect(button).toHaveAttr("type", "submit")
    );
    Scene.scene(
      { update, view: submitView(true) },
      Scene.given({ sendState: "Rest" }),
      Scene.expect(button).toHaveAttr("type", "button")
    );
  });
});
