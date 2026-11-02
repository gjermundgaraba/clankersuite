import { Effect, Fiber, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { describe, expect, it } from "vite-plus/test";

import { settle, settleUntil } from "../test/settle.ts";
import * as BarHeight from "./bar-height.ts";
import * as TopBar from "./top-bar.ts";

const Message = defineMessageUnion({
  GotTopBarMessage: { message: BarHeight.Message },
});

type Message = typeof Message.Type;

const update = (model: null, _message: Message) => ({ model });

const barView = (_model: null, h: HtmlBuilder<Message>) =>
  TopBar.view(
    {
      brand: [h.a([h.Class("wordmark"), h.Href("/")], ["ledger"])],
      nav: [h.nav([h.AriaLabel("Sections")], [])],
      tools: [h.button([], ["keys"])],
      toParentMessage: (message) => Message.GotTopBarMessage({ message }),
    },
    h
  );

const measureBar = Scene.Mount.resolveAll(
  ...BarHeight.sceneMounts((message) => Message.GotTopBarMessage({ message }))
);

describe("TopBar", () => {
  it("is the banner landmark holding the brand, the navigation and the tools", () => {
    Scene.scene(
      { update, view: barView },
      Scene.given(null),
      Scene.Mount.expectHas(BarHeight.MeasureHeight),
      measureBar,
      Scene.expect(Scene.role("banner")).toHaveClass("topbar"),
      Scene.expect(Scene.role("navigation", { name: "Sections" })).toExist(),
      Scene.expect(Scene.selector(".topbar-tools button")).toHaveText("keys")
    );
  });
});

describe("TopBar.MeasureHeight", () => {
  it("writes --topbar-h while the first bar is mounted and removes it after", async () => {
    document.body.innerHTML = `<header class="topbar"></header><header class="topbar"></header>`;
    const [first, second] = [...document.querySelectorAll(".topbar")];

    if (first === undefined || second === undefined) {
      throw new Error("The fixture has no bars.");
    }

    const root = document.documentElement.style;
    const args = { selector: ".topbar", property: "--topbar-h" };

    const specimen = Effect.runFork(
      BarHeight.MeasureHeight(args)
        .f(second, Mount.liveViewStateChanges)
        .pipe(Stream.runDrain)
    );

    await settle();
    expect(root.getPropertyValue("--topbar-h")).toBe("");

    const fiber = Effect.runFork(
      BarHeight.MeasureHeight(args)
        .f(first, Mount.liveViewStateChanges)
        .pipe(Stream.runDrain)
    );

    await settleUntil(() => root.getPropertyValue("--topbar-h") !== "");
    expect(root.getPropertyValue("--topbar-h")).toMatch(/px$/u);

    await Effect.runPromise(Fiber.interrupt(fiber));
    await settle();
    expect(root.getPropertyValue("--topbar-h")).toBe("");
    await Effect.runPromise(Fiber.interrupt(specimen));
  });
});
