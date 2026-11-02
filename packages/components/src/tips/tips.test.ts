import { Effect, Fiber, Option, Stream } from "effect";
import { Scene, Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { keydown } from "../test/events.ts";
import { byId, elementById } from "../test/fixture.ts";
import * as Tips from "./tips.ts";

const fresh = Tips.init({ id: "tip" });

const resolveShow = (text: string, trigger: Tips.Trigger) =>
  Story.Command.resolve(
    Tips.ShowTip({ tipId: "tip", text, trigger }),
    Tips.Message.CompletedShowTip()
  );

const resolveHide = Story.Command.resolve(
  Tips.HideTip({ tipId: "tip" }),
  Tips.Message.CompletedHideTip()
);

const shownText = (model: Tips.Model): Option.Option<string> =>
  Tips.TipState.matchOrElse<Option.Option<string>>(
    model.state,
    {
      Shown: ({ text }) => Option.some(text),
      Leaving: ({ text }) => Option.some(text),
    },
    () => Option.none()
  );

describe("Tips update", () => {
  it("opens on a resting pointer after a moment", () => {
    Story.story(
      Tips.update,
      Story.given(fresh),
      Story.message(
        Tips.Message.EnteredTipTarget({
          text: "Move",
          maybeKey: Option.none(),
          side: "Top",
        })
      ),
      Story.model((model) => {
        expect(shownText(model)).toStrictEqual(Option.none());
      }),
      Story.Command.resolve(
        Tips.WaitBeforeShowing({ version: 1 }),
        Tips.Message.CompletedWaitBeforeShowing({ version: 1 })
      ),
      resolveShow("Move", "Pointer"),
      Story.model((model) => {
        expect(shownText(model)).toStrictEqual(Option.some("Move"));
      })
    );
  });

  it("gives the pointer a moment to cross onto the tip, then closes and stays warm", () => {
    Story.story(
      Tips.update,
      Story.given(
        modifyFields(fresh, {
          state: () =>
            Tips.TipState.Shown({
              text: "Move",
              maybeKey: Option.none(),
              side: "Top",
              trigger: "Pointer",
            }),
        })
      ),
      Story.message(Tips.Message.LeftTipTarget()),
      Story.Command.resolve(
        Tips.WaitBeforeHiding({ version: 1 }),
        Tips.Message.CompletedWaitBeforeHiding({ version: 1 })
      ),
      resolveHide,
      Story.model((model) => {
        expect(model.state).toStrictEqual(Tips.TipState.Warm());
      }),
      Story.Command.resolve(
        Tips.WaitBeforeCooling({ version: 2 }),
        Tips.Message.CompletedWaitBeforeCooling({ version: 2 })
      ),
      Story.model((model) => {
        expect(model.state).toStrictEqual(Tips.TipState.Cold());
      })
    );
  });

  it("keeps a tip the pointer crossed onto", () => {
    Story.story(
      Tips.update,
      Story.given(
        modifyFields(fresh, {
          version: () => 3,
          state: () =>
            Tips.TipState.Leaving({
              text: "Move",
              maybeKey: Option.none(),
              side: "Top",
              trigger: "Pointer",
            }),
        })
      ),
      Story.message(Tips.Message.EnteredTip()),
      Story.message(Tips.Message.CompletedWaitBeforeHiding({ version: 3 })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(shownText(model)).toStrictEqual(Option.some("Move"));
      })
    );
  });

  it("opens the next tip at once while one has just closed", () => {
    Story.story(
      Tips.update,
      Story.given(
        modifyFields(fresh, {
          version: () => 2,
          state: () => Tips.TipState.Warm(),
        })
      ),
      Story.message(
        Tips.Message.EnteredTipTarget({
          text: "Copy",
          maybeKey: Option.none(),
          side: "Right",
        })
      ),
      resolveShow("Copy", "Pointer"),
      Story.model((model) => {
        expect(shownText(model)).toStrictEqual(Option.some("Copy"));
      })
    );
  });

  it("opens on keyboard focus, stays when the pointer leaves, and closes on a key", () => {
    Story.story(
      Tips.update,
      Story.given(fresh),
      Story.message(
        Tips.Message.FocusedTipTarget({
          text: "Close",
          maybeKey: Option.none(),
          side: "Top",
        })
      ),
      resolveShow("Close", "Focus"),
      Story.message(Tips.Message.LeftTipTarget()),
      Story.Command.expectNone(),
      Story.message(Tips.Message.PressedKey()),
      resolveHide,
      Story.Command.resolve(
        Tips.WaitBeforeCooling,
        Tips.Message.CompletedWaitBeforeCooling({ version: 1 })
      ),
      Story.model((model) => {
        expect(shownText(model)).toStrictEqual(Option.none());
      })
    );
  });

  it("forgets a tip still waiting when the pointer presses or leaves", () => {
    Story.story(
      Tips.update,
      Story.given(
        modifyFields(fresh, {
          version: () => 1,
          state: () =>
            Tips.TipState.Waiting({
              text: "Move",
              maybeKey: Option.none(),
              side: "Top",
            }),
        })
      ),
      Story.message(Tips.Message.PressedPointer()),
      Story.message(Tips.Message.CompletedWaitBeforeShowing({ version: 1 })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.state).toStrictEqual(Tips.TipState.Cold());
      })
    );
  });
});

describe("Tips view", () => {
  it("is one manual popover kept out of the accessibility tree, with the words it shows", () => {
    Scene.scene(
      { update: Tips.update, view: Tips.view },
      Scene.given(
        modifyFields(fresh, {
          state: () =>
            Tips.TipState.Shown({
              text: "Move",
              maybeKey: Option.none(),
              side: "Right",
              trigger: "Focus",
            }),
        })
      ),
      Scene.expect(Scene.selector("#tip")).toHaveClass("tip"),
      Scene.expect(Scene.selector("#tip")).toHaveAttr("popover", "manual"),
      Scene.expect(Scene.selector("#tip")).toHaveAttr("aria-hidden", "true"),
      Scene.expect(Scene.selector("#tip")).toHaveText("Move"),
      Scene.expect(Scene.selector("#tip")).toHaveAttr("data-side", "right")
    );
  });

  it("prints the key a control names after its words", () => {
    Scene.scene(
      { update: Tips.update, view: Tips.view },
      Scene.given(
        modifyFields(fresh, {
          state: () =>
            Tips.TipState.Shown({
              text: "Hide tasks",
              maybeKey: Option.some("⌃\\"),
              side: "Top",
              trigger: "Pointer",
            }),
        })
      ),
      Scene.expect(Scene.selector("#tip")).toHaveText("Hide tasks⌃\\"),
      Scene.expect(Scene.selector("#tip kbd.key-hint")).toHaveText("⌃\\")
    );
  });

  it("is empty with no tip", () => {
    Scene.scene(
      { update: Tips.update, view: Tips.view },
      Scene.given(fresh),
      Scene.expect(Scene.selector("#tip")).toBeEmpty(),
      Scene.expect(Scene.selector("#tip")).not.toHaveAttr("data-side")
    );
  });
});

const renderPage = (): void => {
  document.body.innerHTML = `
    <div role="toolbar" aria-orientation="vertical"><button id="side" data-tip="Zoom in">+</button></div>
    <button id="move" data-tip="Move"><svg id="glyph"></svg></button>
    <header><button style="writing-mode: vertical-rl" id="fold" data-tip="Show tasks" data-tip-key="⌃\\">|</button></header>
    <p id="plain">text</p>
    <div id="tip" popover="manual" aria-hidden="true"></div>`;
};

const pointerOver = (id: string, pointerType = "mouse") => {
  const event = new PointerEvent("pointerover", {
    bubbles: true,
    pointerType,
  });

  elementById(id).dispatchEvent(event);

  return event;
};

const read = (id: string, pointerType?: string) => {
  const event = new PointerEvent("pointerover", {
    bubbles: true,
    ...(pointerType !== undefined && { pointerType }),
  });

  Object.defineProperty(event, "target", { value: elementById(id) });

  return Tips.pointerOverMessage("tip", event);
};

const blur = (relatedTarget: Element | null) => {
  const event = new FocusEvent("focusout", {
    bubbles: true,
    relatedTarget,
  });

  Object.defineProperty(event, "target", { value: byId("move") });

  return Tips.focusOutMessage(event);
};

const pressKeys = (trigger: Tips.Trigger, events: readonly KeyboardEvent[]) => {
  renderPage();
  const reached: string[] = [];
  const messages: Tips.Message[] = [];

  const onBody = (event: KeyboardEvent): void => {
    reached.push(event.key);
  };

  const onKey = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      messages.push(...Option.toArray(Tips.keyMessage(event, trigger)));
    }
  };

  document.body.addEventListener("keydown", onBody);
  document.addEventListener("keydown", onKey, { capture: true });

  for (const event of events) {
    byId("move").dispatchEvent(event);
  }

  document.removeEventListener("keydown", onKey, { capture: true });
  document.body.removeEventListener("keydown", onBody);

  return { reached, messages };
};

describe("Tips events", () => {
  it("reads the words of the control under the pointer, its key and its side", () => {
    renderPage();

    expect(read("glyph", "mouse")).toStrictEqual(
      Option.some(
        Tips.Message.EnteredTipTarget({
          text: "Move",
          maybeKey: Option.none(),
          side: "Top",
        })
      )
    );
    expect(read("side", "pen")).toStrictEqual(
      Option.some(
        Tips.Message.EnteredTipTarget({
          text: "Zoom in",
          maybeKey: Option.none(),
          side: "Right",
        })
      )
    );
    expect(read("fold", "mouse")).toStrictEqual(
      Option.some(
        Tips.Message.EnteredTipTarget({
          text: "Show tasks",
          maybeKey: Option.some("⌃\\"),
          side: "Right",
        })
      )
    );
    expect(read("plain", "mouse")).toStrictEqual(
      Option.some(Tips.Message.LeftTipTarget())
    );
    expect(read("tip", "mouse")).toStrictEqual(
      Option.some(Tips.Message.EnteredTip())
    );
    expect(read("move", "touch")).toStrictEqual(Option.none());
  });

  it("stops Escape at a tip keyboard focus brought up, and lets other keys go on", () => {
    const escape = keydown("Escape");
    const { reached, messages } = pressKeys("Focus", [escape, keydown("j")]);

    expect(escape.defaultPrevented).toBe(true);
    expect(reached).toStrictEqual(["j"]);
    expect(messages).toStrictEqual([
      Tips.Message.PressedKey(),
      Tips.Message.PressedKey(),
    ]);
  });

  it("lets Escape through a pointer's tip, so a dialog's first Escape still closes it", () => {
    const escape = keydown("Escape");
    const { reached, messages } = pressKeys("Pointer", [escape]);

    expect(escape.defaultPrevented).toBe(false);
    expect(reached).toStrictEqual(["Escape"]);
    expect(messages).toStrictEqual([Tips.Message.PressedKey()]);
  });

  it("leaves the tip alone while a key composes text", () => {
    const composing = keydown("Escape", { isComposing: true });
    const { reached, messages } = pressKeys("Focus", [composing]);

    expect(composing.defaultPrevented).toBe(false);
    expect(reached).toStrictEqual(["Escape"]);
    expect(messages).toStrictEqual([]);
  });

  it("closes when focus leaves a control, not when it moves inside it", () => {
    renderPage();

    expect(blur(byId("plain"))).toStrictEqual(
      Option.some(Tips.Message.BlurredTipTarget())
    );
    expect(blur(elementById("glyph"))).toStrictEqual(Option.none());
  });

  it("listens to the page's pointer while subscribed, one message per control", async () => {
    renderPage();
    const { tipPointerAndFocus: pointerAndFocus } = Tips.subscriptions("tip");
    const MAX_ATTEMPTS = 100;

    const messages = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          pointerAndFocus
            .dependenciesToStream(pointerAndFocus.modelToDependencies(fresh))
            .pipe(Stream.take(2), Stream.runCollect)
        );

        yield* Effect.yieldNow.pipe(
          Effect.andThen(
            Effect.sync(() => {
              pointerOver("move");
              pointerOver("glyph");
              pointerOver("plain");
            })
          ),
          Effect.repeat({
            times: MAX_ATTEMPTS,
            while: () => fiber.pollUnsafe() === undefined,
          })
        );

        return yield* Fiber.join(fiber);
      })
    );

    expect(messages).toStrictEqual([
      Tips.Message.EnteredTipTarget({
        text: "Move",
        maybeKey: Option.none(),
        side: "Top",
      }),
      Tips.Message.LeftTipTarget(),
    ]);
  });
});
