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

const keysOnly = (_model: null, h: HtmlBuilder<Message>) =>
  StatusBar.view(
    {
      keys: [
        { keys: "J", otherKeys: ["K"], does: "move" },
        { keys: "X", does: "complete" },
      ],
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
      Scene.expect(Scene.role("contentinfo")).toHaveClass("gg-statusbar"),
      Scene.expect(Scene.selector(".gg-statusbar-state")).toHaveText(
        "Online3 waiting"
      ),
      Scene.expect(Scene.role("status")).toHaveText("Online"),
      Scene.expect(Scene.selector(".gg-statusbar-keys")).toHaveText(
        "⌘K commands? keys"
      ),
      Scene.expect(Scene.selector(".gg-statusbar-keys kbd")).not.toHaveAttr(
        "aria-hidden"
      )
    );
  });

  it("prints no key line without keys", () => {
    Scene.scene(
      { update, view: barView([]) },
      Scene.given(null),
      measureBar,
      Scene.expect(Scene.selector(".gg-statusbar-keys")).toBeAbsent()
    );
  });

  it("holds only its keys when the state is elsewhere, in a rail's foot", () => {
    Scene.scene(
      { update, view: keysOnly },
      Scene.given(null),
      measureBar,
      Scene.expect(Scene.role("contentinfo")).toHaveText("JK moveX complete"),
      Scene.expect(Scene.text("K")).toHaveClass("gg-key-hint"),
      Scene.expect(Scene.selector(".gg-statusbar-state")).toBeAbsent()
    );
  });
});
