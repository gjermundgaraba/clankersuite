import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as LinkState from "../link-state/link-state.ts";
import * as BarHeight from "../top-bar/bar-height.ts";
import * as StatusBar from "./status-bar.ts";

const Message = defineMessageUnion({
  GotStatusBarMessage: { message: BarHeight.Message },
});

type Message = typeof Message.Type;

const update = (model: null, _message: Message) => ({ model });

const barView =
  (keys: readonly StatusBar.KeyNote[]) =>
  (_model: null, h: HtmlBuilder<Message>) =>
    StatusBar.view(
      {
        body: [LinkState.view({ state: "Online" }, h), "3 waiting"],
        keys,
        platform: "Apple",
        toParentMessage: (message) => Message.GotStatusBarMessage({ message }),
      },
      h
    );

const measureBar = Scene.Mount.resolve(
  { name: BarHeight.MeasureHeight.name },
  Message.GotStatusBarMessage({
    message: BarHeight.Message.CompletedMeasureHeight(),
  })
);

describe("StatusBar", () => {
  it("is the page's footer: the state at the left, the keys read as content", () => {
    Scene.scene(
      {
        update,
        view: barView([
          { keys: "Mod+K", does: "commands" },
          { keys: "?", does: "keys" },
        ]),
      },
      Scene.given(null),
      measureBar,
      Scene.expect(Scene.role("contentinfo")).toHaveClass("statusbar"),
      Scene.expect(Scene.selector(".statusbar-state")).toHaveText(
        "online3 waiting"
      ),
      Scene.expect(Scene.role("status")).toHaveText("online"),
      Scene.expect(Scene.selector(".statusbar-keys")).toHaveText(
        "⌘K commands? keys"
      ),
      Scene.expect(Scene.selector(".statusbar-keys kbd")).not.toHaveAttr(
        "aria-hidden"
      )
    );
  });

  it("prints no key line without keys", () => {
    Scene.scene(
      { update, view: barView([]) },
      Scene.given(null),
      measureBar,
      Scene.expect(Scene.selector(".statusbar-keys")).toBeAbsent()
    );
  });
});
