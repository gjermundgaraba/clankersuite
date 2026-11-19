import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as TitleField from "./title-field.ts";

type Model = Readonly<{ title: string; saved: string }>;

type Message = Readonly<{ typed: string }> | "Enter";

const update = (model: Model, message: Message) => ({
  model:
    message === "Enter"
      ? { ...model, saved: model.title }
      : { ...model, title: message.typed },
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
          onInput: (typed) => ({ typed }),
          onEnter: "Enter",
        },
        h
      ),
      h.p([], [`Saved: ${model.saved}`]),
    ]
  );

const title = Scene.role("textbox", { name: "Title" });

describe("TitleField", () => {
  it("is a one-line textbox named by its label, holding the title it prints", () => {
    Scene.scene(
      { update, view },
      Scene.given({ title: "Book dentist", saved: "" }),
      Scene.expect(title).toHaveValue("Book dentist"),
      Scene.expect(title).toHaveAttr("rows", "1"),
      Scene.expect(title).toHaveClass("gg-title-field")
    );
  });

  it("sends each edit, and on Enter sends onEnter without breaking the line", () => {
    Scene.scene(
      { update, view },
      Scene.given({ title: "Book dentist", saved: "" }),
      Scene.type(title, "Book the dentist"),
      Scene.expect(Scene.text("Saved: ")).toExist(),
      Scene.keydown(title, "Enter"),
      Scene.expectHandled(),
      Scene.expect(title).toHaveValue("Book the dentist"),
      Scene.expect(Scene.text("Saved: Book the dentist")).toExist()
    );
  });

  it("turns a pasted line break into a space, so the title stays one line", () => {
    Scene.scene(
      { update, view },
      Scene.given({ title: "Book dentist", saved: "" }),
      Scene.type(title, "Book the dentist\nand the\r\nhygienist"),
      Scene.expect(title).toHaveValue("Book the dentist and the hygienist")
    );
  });
});
