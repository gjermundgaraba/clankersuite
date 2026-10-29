import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Keymap from "./keymap.ts";

describe("Keymap", () => {
  it("heads each group, prints each key in a kbd beside what it does, then the note", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Keymap.view(
            {
              groups: [
                { title: "Move", rows: [{ keys: "j / ↓", does: "Next item" }] },
                {
                  title: "Anywhere",
                  rows: [{ keys: "Ctrl+K", does: "Find a command" }],
                },
              ],
              note: "Keys wait while you type in a field.",
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("heading", { name: "Move" })).toExist(),
      Scene.expect(Scene.role("heading", { name: "Anywhere" })).toExist(),
      Scene.expect(
        Scene.first(Scene.all.selector(".keymap-row kbd"))
      ).toHaveText("j / ↓"),
      Scene.expect(Scene.selector(".note-line")).toHaveText(
        "Keys wait while you type in a field."
      )
    );
  });
});
