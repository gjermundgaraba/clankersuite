import { Array, Effect, Fiber, Schema, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import * as Button from "../button/button.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { byId, bySelector, pressOn } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import * as Toolbar from "./toolbar.ts";

const Tool = Schema.Literals(["Pen", "Eraser"]);

type Tool = typeof Tool.Type;

const Model = Schema.Struct({ tool: Tool });

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  SelectedTool: { tool: Tool },
  GotToolbarMessage: { message: Toolbar.Message },
});

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<{ model: Model }>(message, {
    SelectedTool: ({ tool }) => ({
      model: modifyFields(model, { tool: () => tool }),
    }),
    GotToolbarMessage: () => ({ model }),
  });

const toolbarView = (model: Model, h: HtmlBuilder<Message>) =>
  Toolbar.view(
    {
      label: "Drawing",
      orientation: "Vertical",
      isFloating: true,
      toParentMessage: (message) => Message.GotToolbarMessage({ message }),
      tools: [
        IconButton.view(
          {
            glyph: "plus",
            label: "Pen",
            onClick: Message.SelectedTool({ tool: "Pen" }),
            attributes: [Button.pressedAttribute(model.tool === "Pen", h)],
          },
          h
        ),
        IconButton.view(
          {
            glyph: "cross",
            label: "Eraser",
            onClick: Message.SelectedTool({ tool: "Eraser" }),
            attributes: [Button.pressedAttribute(model.tool === "Eraser", h)],
          },
          h
        ),
      ],
    },
    h
  );

const toolbar = Scene.role("toolbar", { name: "Drawing" });

describe("Toolbar view", () => {
  it("is a named toolbar with its orientation and its keys bound", () => {
    Scene.scene(
      { update, view: toolbarView },
      Scene.given<Model>({ tool: "Pen" }),
      Scene.Mount.expectHas(Toolbar.BindToolKeys),
      Scene.Mount.resolve(
        { name: Toolbar.BindToolKeys.name },
        Message.GotToolbarMessage({
          message: Toolbar.Message.MovedToolFocus({ move: "Next" }),
        })
      ),
      Scene.expect(toolbar).toHaveAttr("aria-orientation", "vertical"),
      Scene.expect(toolbar).toHaveClass("floating"),
      Scene.expect(Scene.role("button", { name: "Pen" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.click(Scene.role("button", { name: "Eraser" })),
      Scene.expect(Scene.role("button", { name: "Eraser" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "Pen" })).toHaveAttr(
        "aria-pressed",
        "false"
      )
    );
  });
});

const renderToolbar = (): HTMLElement => {
  document.body.innerHTML = `
    <div role="toolbar" aria-label="Edit">
      <button id="bold">bold</button>
      <button id="gone" disabled>gone</button>
      <button id="held" aria-disabled="true">held</button>
      <input id="size" />
      <span popover><button id="in-menu">in a menu</button></span>
      <a id="help" href="#help">help</a>
    </div>`;

  return bySelector('[role="toolbar"]');
};

const activeId = (): string | undefined => document.activeElement?.id;

const tabIndexes = (): readonly number[] =>
  Array.map(["bold", "held", "help"], (id) => byId(id).tabIndex);

const bindToolbar = (bar: HTMLElement) =>
  Effect.runFork(
    Toolbar.BindToolKeys()
      .f(bar, Mount.liveViewStateChanges)
      .pipe(Stream.take(1), Stream.runCollect)
  );

const keepToolbarBound = async (bar: HTMLElement) => {
  const fiber = Effect.runFork(
    Toolbar.BindToolKeys()
      .f(bar, Mount.liveViewStateChanges)
      .pipe(Stream.runDrain)
  );

  await settleUntil(() => byId("held").tabIndex === -1);

  return fiber;
};

describe("Toolbar keys", () => {
  it("moves along either axis, passes over a disabled tool and holds at the ends", async () => {
    const fiber = await keepToolbarBound(renderToolbar());

    expect(pressOn("bold", "ArrowRight").defaultPrevented).toBe(true);
    expect(activeId()).toBe("held");
    expect(pressOn("held", "ArrowDown").defaultPrevented).toBe(true);
    expect(activeId()).toBe("help");
    expect(pressOn("help", "ArrowRight").defaultPrevented).toBe(true);
    expect(activeId()).toBe("help");
    pressOn("help", "Home");
    expect(activeId()).toBe("bold");
    pressOn("bold", "ArrowUp");
    expect(activeId()).toBe("bold");
    pressOn("bold", "End");
    expect(activeId()).toBe("help");
    expect(tabIndexes()).toStrictEqual([-1, -1, 0]);
    await Effect.runPromise(Fiber.interrupt(fiber));
  });

  it("leaves keys in a field, in a menu, while composing, modified or handled alone", async () => {
    const fiber = await keepToolbarBound(renderToolbar());

    expect(pressOn("size", "ArrowRight").defaultPrevented).toBe(false);
    expect(activeId()).toBe("size");
    expect(pressOn("in-menu", "ArrowDown").defaultPrevented).toBe(false);
    expect(activeId()).toBe("in-menu");
    expect(
      pressOn("bold", "ArrowRight", { isComposing: true }).defaultPrevented
    ).toBe(false);
    expect(
      pressOn("bold", "ArrowRight", { shiftKey: true }).defaultPrevented
    ).toBe(false);
    expect(activeId()).toBe("bold");
    byId("bold").addEventListener(
      "keydown",
      (event) => {
        event.preventDefault();
      },
      { once: true }
    );
    pressOn("bold", "ArrowRight");
    expect(activeId()).toBe("bold");
    await Effect.runPromise(Fiber.interrupt(fiber));
  });

  it("keeps one tool in the tab order, follows focus, reports moves and lets go after", async () => {
    const bar = renderToolbar();
    const fiber = bindToolbar(bar);
    await settleUntil(() => byId("held").tabIndex === -1);

    byId("held").focus();
    pressOn("size", "ArrowLeft");
    pressOn("held", "End");
    const moves = await Effect.runPromise(Fiber.join(fiber));

    expect(moves).toStrictEqual([
      Toolbar.Message.MovedToolFocus({ move: "Last" }),
    ]);
    expect(tabIndexes()).toStrictEqual([-1, -1, 0]);

    const afterUnmount = pressOn("help", "Home");
    expect(afterUnmount.defaultPrevented).toBe(false);
    expect(activeId()).toBe("help");
  });

  it("starts the tab order on the first tool and moves it with focus", async () => {
    const bar = renderToolbar();
    const fiber = bindToolbar(bar);
    await settleUntil(() => byId("held").tabIndex === -1);

    expect(tabIndexes()).toStrictEqual([0, -1, -1]);
    byId("help").focus();
    byId("help").dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settleUntil(() => byId("help").tabIndex === 0);
    expect(tabIndexes()).toStrictEqual([-1, -1, 0]);
    await Effect.runPromise(Fiber.interrupt(fiber));
  });

  it("moves the stop to the first tool when the tool holding it is disabled", async () => {
    const fiber = await keepToolbarBound(renderToolbar());

    byId("bold").setAttribute("disabled", "");
    await settleUntil(() => byId("held").tabIndex === 0);
    expect(byId("help").tabIndex).toBe(-1);
    await Effect.runPromise(Fiber.interrupt(fiber));
  });
});
