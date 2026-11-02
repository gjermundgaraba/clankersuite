import { Dialog as UiDialog } from "@foldkit/ui";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import * as Dialog from "../dialog/dialog.ts";
import * as KeyHelp from "./key-help.ts";

const BINDINGS: readonly KeyHelp.Binding[] = [
  { keys: ["J", "ArrowDown"], group: "Move", does: "Next item" },
  { keys: [["G", "G"]], group: "Move", does: "First item" },
  { keys: ["Mod+K"], group: "Anywhere", does: "Find a command" },
];

const closedHelp = KeyHelp.init({ id: "keys" });
const openHelp = KeyHelp.open(closedHelp).model;

describe("KeyHelp listing", () => {
  it("groups the bindings in the order their groups first appear, printed for the platform", () => {
    expect(KeyHelp.toKeymapGroups(BINDINGS, "Apple", "")).toStrictEqual([
      {
        title: "Move",
        rows: [
          { keys: "j / ↓", does: "Next item" },
          { keys: "gg", does: "First item" },
        ],
      },
      { title: "Anywhere", rows: [{ keys: "⌘K", does: "Find a command" }] },
    ]);
  });

  it("finds a binding by its words or its keys", () => {
    expect(KeyHelp.toKeymapGroups(BINDINGS, "Other", "  FIRST ")).toStrictEqual(
      [{ title: "Move", rows: [{ keys: "gg", does: "First item" }] }]
    );
    expect(KeyHelp.toKeymapGroups(BINDINGS, "Other", "ctrl+k")).toStrictEqual([
      { title: "Anywhere", rows: [{ keys: "Ctrl+K", does: "Find a command" }] },
    ]);
    expect(
      KeyHelp.toKeymapGroups(BINDINGS, "Other", "nothing like it")
    ).toStrictEqual([]);
  });
});

describe("KeyHelp update", () => {
  it("opens on its key with an empty find field", () => {
    Story.story(
      KeyHelp.update,
      Story.given(modifyFields(closedHelp, { query: () => "stale words" })),
      Story.message(KeyHelp.Message.PressedHelpKey()),
      Story.model((model) => {
        expect(KeyHelp.isOpen(model)).toBe(true);
        expect(model.query).toBe("");
      }),
      Story.Command.resolve(
        UiDialog.ShowDialog,
        UiDialog.Message.SucceededShowDialog()
      )
    );
  });

  it("reports Closed when Escape or the veil asks to close", () => {
    Story.story(
      KeyHelp.update,
      Story.given(openHelp),
      Story.message(
        KeyHelp.Message.GotDialogMessage({
          message: Dialog.Message.GotDialogMessage({
            message: UiDialog.Message.RequestedClose(),
          }),
        })
      ),
      Story.expectOutMessage(KeyHelp.OutMessage.Closed()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(KeyHelp.isOpen(model)).toBe(false);
      })
    );
  });
});

const helpView = (model: KeyHelp.Model, h: HtmlBuilder<KeyHelp.Message>) =>
  KeyHelp.view(
    model,
    {
      bindings: BINDINGS,
      platform: "Other",
      toIntroView: () => [h.p([h.Class("intro")], ["The board is in front."])],
    },
    h
  );

describe("KeyHelp view", () => {
  it("lists every key with its own, and narrows the list as the reader types", () => {
    Scene.scene(
      { update: KeyHelp.update, view: helpView },
      Scene.given(openHelp),
      Scene.Mount.resolveAll(...Dialog.sceneMounts),
      Scene.expect(Scene.role("dialog", { name: "Keys" })).toExist(),
      Scene.expect(Scene.selector(".card .intro")).toHaveText(
        "The board is in front."
      ),
      Scene.expect(Scene.selector(".keymap")).toContainText("Find a command"),
      Scene.expect(Scene.selector(".keymap")).toContainText("These keys"),
      Scene.expect(Scene.label("Find a key")).toHaveAttr(
        "data-foldkit-dialog-initial-focus"
      ),
      Scene.type(Scene.label("Find a key"), "first"),
      Scene.expect(Scene.selector(".keymap")).toContainText("First item"),
      Scene.expect(Scene.selector(".keymap")).not.toContainText(
        "Find a command"
      ),
      Scene.type(Scene.label("Find a key"), "zzz"),
      Scene.expect(Scene.selector(".note-line")).toHaveText("No key does that.")
    );
  });
});
