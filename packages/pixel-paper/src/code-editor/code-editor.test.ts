import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as CodeEditor from "./code-editor.ts";

const Message = defineMessageUnion({ UpdatedBody: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (_model: string, message: Message) => ({ model: message.value });

const editorView = (model: string, h: HtmlBuilder<Message>) =>
  CodeEditor.view(
    {
      id: "body",
      value: model,
      onInput: (value) => Message.UpdatedBody({ value }),
      label: "Request body",
    },
    h
  );

describe("CodeEditor", () => {
  it("is a named textarea holding the caller's code, with spelling and capitals off", () => {
    Scene.scene(
      { update, view: editorView },
      Scene.given("{"),
      Scene.expect(Scene.role("textbox", { name: "Request body" })).toHaveValue(
        "{"
      ),
      Scene.expect(Scene.role("textbox")).toHaveAttr("id", "body"),
      Scene.expect(Scene.role("textbox")).toHaveClass("code-surface"),
      Scene.expect(Scene.role("textbox")).toHaveAttr("autocapitalize", "off"),
      Scene.type(Scene.role("textbox"), "{}"),
      Scene.expect(Scene.role("textbox")).toHaveValue("{}")
    );
  });
});
