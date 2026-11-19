import { afterEach, describe, expect, it } from "vite-plus/test";

import { defineMarkdownEditorElement } from "./element.ts";

defineMarkdownEditorElement();

describe("<gg-markdown-editor>", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("shows the placeholder its textarea has now, not the one it mounted with", async () => {
    const editor = document.createElement("gg-markdown-editor");
    const textarea = document.createElement("textarea");

    textarea.placeholder = "Notes, in Markdown…";
    editor.append(textarea);
    document.body.append(editor);

    expect(document.querySelector(".cm-placeholder")?.textContent).toBe(
      "Notes, in Markdown…"
    );

    textarea.placeholder = "What the call is about…";
    await Promise.resolve();

    expect(document.querySelector(".cm-placeholder")?.textContent).toBe(
      "What the call is about…"
    );
  });
});
