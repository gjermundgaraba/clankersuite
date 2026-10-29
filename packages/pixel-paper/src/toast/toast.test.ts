import { Animation, Toast as UiToast } from "@foldkit/ui";
import { Array, Duration, Effect, Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { ANNOUNCER_ATTRIBUTE } from "../announcer/announcer.ts";
import { Focus } from "../focus/focus.ts";
import { keydown, readDuringDispatch } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import { settle, settleUntil } from "../test/settle.ts";
import { showing } from "./stack.ts";
import * as Toast from "./toast.ts";
import { stackFocusIn, stackFocusOut, stackKey } from "./toast.ts";

import TOKENS from "../tokens.css?raw";

const TOAST_HOLD_TOKEN = Duration.seconds(
  Number(/--toast-hold: (?<seconds>\d+)s;/u.exec(TOKENS)?.groups?.["seconds"])
);

const emptyStack = Toast.init({ id: "toasts" });

const raise = (model: Toast.Model, config: Toast.ShowConfig): Toast.Model =>
  Toast.show(model, config).model;

const titles = (model: Toast.Model): readonly string[] =>
  Array.map(showing(model.stack), (entry) => entry.payload.title);

const names = (
  commands: ReadonlyArray<Readonly<{ name: string }>> | undefined
) => Array.map(commands ?? [], ({ name }) => name);

const SAVED: Toast.ShowConfig = { tone: "Ok", title: "Saved" };

const NOT_SENT: Toast.ShowConfig = {
  tone: "Error",
  title: "Not sent",
  body: "The server did not answer. Try again.",
};

const leave = (entryId: string) => UiToast.test.drainEntry({ entryId });

const announced = (
  commands: ReadonlyArray<Readonly<{ name: string; args?: unknown }>> = []
) =>
  Array.map(
    Array.filter(commands, ({ name }) => name === Toast.AnnounceSlip.name),
    ({ args }) => args
  );

describe("Toast update", () => {
  it("holds a calm slip for the --toast-hold token and an error until it is dismissed, and says each", () => {
    const first = Toast.show(emptyStack, SAVED);
    const second = Toast.show(first.model, NOT_SENT);
    const [saved, notSent] = second.model.stack.entries;

    expect(saved?.maybeDuration).toStrictEqual(Option.some(TOAST_HOLD_TOKEN));
    expect(notSent?.maybeDuration).toStrictEqual(Option.none());
    expect(first.entryId).toBe("toasts-entry-0");
    expect(second.entryId).toBe("toasts-entry-1");

    expect(announced(second.commands)).toStrictEqual([
      {
        stackId: "toasts",
        text: "Not sent. The server did not answer. Try again.",
      },
    ]);
    expect(announced(first.commands)).toStrictEqual([
      { stackId: "toasts", text: "Saved." },
    ]);
  });

  it("shows at most three calm slips, the oldest giving way, and never counts errors", () => {
    const configs: readonly Toast.ShowConfig[] = [
      NOT_SENT,
      { tone: "Ok", title: "One" },
      { tone: "Quiet", title: "Two" },
      { tone: "Ok", title: "Three" },
      { tone: "Ok", title: "Four" },
      NOT_SENT,
    ];

    const stack = Array.reduce(configs, emptyStack, raise);

    expect(titles(stack)).toStrictEqual([
      "Not sent",
      "Two",
      "Three",
      "Four",
      "Not sent",
    ]);
  });

  it("takes the newest on Escape, keeping the keyboard on the slip in its place", () => {
    const two = raise(raise(emptyStack, NOT_SENT), {
      ...NOT_SENT,
      title: "Not saved",
    });

    Story.story(
      Toast.update,
      Story.given(two),
      Story.message(
        Toast.Message.FocusedStack({ maybeFromId: Option.some("save") })
      ),
      Story.message(Toast.Message.PressedEscape()),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual(["Not sent"]);
      }),
      Story.Command.expectHas(Toast.FocusSlip({ entryId: "toasts-entry-0" })),
      Story.Command.resolve(
        Toast.FocusSlip,
        Toast.Message.CompletedFocusSlip()
      ),
      leave("toasts-entry-1")
    );
  });

  it("puts focus back where it came from once the keyboard dismissed the last slip", () => {
    Story.story(
      Toast.update,
      Story.given(raise(emptyStack, NOT_SENT)),
      Story.message(
        Toast.Message.FocusedStack({ maybeFromId: Option.some("save") })
      ),
      Story.message(
        Toast.Message.ClickedDismiss({ entryId: "toasts-entry-0" })
      ),
      Story.Command.expectHas(Focus({ id: "save" })),
      Story.Command.resolve(Focus, Toast.Message.CompletedFocus()),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual([]);
        expect(model.isFocusIn).toBe(false);
      }),
      leave("toasts-entry-0")
    );
  });

  it("leaves focus alone when a pointer dismisses a slip", () => {
    Story.story(
      Toast.update,
      Story.given(raise(emptyStack, NOT_SENT)),
      Story.message(
        Toast.Message.ClickedDismiss({ entryId: "toasts-entry-0" })
      ),
      leave("toasts-entry-0"),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual([]);
      })
    );
  });
});

const WAIT = UiToast.WaitBeforeDismissal.name;

const isWaitArgs = Schema.is(
  Schema.Struct({ entryId: Schema.String, version: Schema.Finite })
);

const leavingAfterWaits = (
  result: Readonly<{
    model: Toast.Model;
    commands?: ReadonlyArray<Readonly<{ name: string; args?: unknown }>>;
  }>
): number =>
  Array.filter(
    Array.filter(result.commands ?? [], ({ name }) => name === WAIT),
    ({ args }) =>
      isWaitArgs(args) &&
      names(
        Toast.update(
          result.model,
          Toast.Message.GotStackMessage({
            message: UiToast.Message.CompletedWaitBeforeDismissal(args),
          })
        ).commands
      ).length > 0
  ).length;

describe("Toast hold", () => {
  const two = raise(raise(emptyStack, SAVED), {
    tone: "Quiet",
    title: "Synced",
  });

  const hoveredFirst = Toast.Message.GotStackMessage({
    message: UiToast.Message.HoveredEntry({ entryId: "toasts-entry-0" }),
  });

  const leftFirst = Toast.Message.GotStackMessage({
    message: UiToast.Message.LeftEntry({ entryId: "toasts-entry-0" }),
  });

  it("holds every slip while the pointer rests on one, and lets them all go when it leaves", () => {
    const hovered = Toast.update(two, hoveredFirst);
    const left = Toast.update(hovered.model, leftFirst);

    expect(hovered.model.isPointerIn).toBe(true);
    expect(names(hovered.commands)).not.toContain(WAIT);
    expect(names(left.commands)).toStrictEqual([WAIT, WAIT]);
    expect(left.model.isPointerIn).toBe(false);
  });

  it("keeps holding while the keyboard is in the stack, and a slip raised meanwhile waits too", () => {
    const focused = Toast.update(
      two,
      Toast.Message.FocusedStack({ maybeFromId: Option.none() })
    );

    const hovered = Toast.update(focused.model, hoveredFirst);
    const left = Toast.update(hovered.model, leftFirst);
    const raised = Toast.show(left.model, { tone: "Ok", title: "Moved" });
    const blurred = Toast.update(raised.model, Toast.Message.BlurredStack());

    expect(leavingAfterWaits(left)).toBe(0);
    expect(leavingAfterWaits(raised)).toBe(0);
    expect(leavingAfterWaits(blurred)).toBe(3);
    expect(names(blurred.commands)).toStrictEqual([WAIT, WAIT, WAIT]);
  });

  it("changes nothing for a blur while the keyboard was not in the stack", () => {
    const blurred = Toast.update(two, Toast.Message.BlurredStack());

    expect(blurred.model).toStrictEqual(two);
    expect(blurred.commands ?? []).toStrictEqual([]);
  });

  it("lets go of its holds when the stack moves to another host", () => {
    const focused = Toast.update(
      two,
      Toast.Message.FocusedStack({ maybeFromId: Option.none() })
    );

    const moved = Toast.update(focused.model, Toast.Message.MovedHost());

    expect(moved.model.isFocusIn).toBe(false);
    expect(names(moved.commands)).toStrictEqual([WAIT, WAIT]);
  });
});

const stackView = (model: Toast.Model, h: HtmlBuilder<Toast.Message>) =>
  Toast.view(model, h);

const LEAVE_GENERATION = 2;

const resolveStack = Scene.Mount.resolve(
  Toast.BindStack,
  Toast.Message.FocusedStack({ maybeFromId: Option.none() })
);

describe("Toast view", () => {
  it("is a region named Notifications, saying an error as a status", () => {
    Scene.scene(
      { update: Toast.update, view: stackView },
      Scene.given(raise(raise(emptyStack, SAVED), NOT_SENT)),
      resolveStack,
      Scene.expect(Scene.role("region", { name: "Notifications" })).toExist(),
      Scene.expectAll(Scene.all.role("status")).toHaveCount(2),
      Scene.expectAll(Scene.all.role("alert")).toHaveCount(0),
      Scene.expect(Scene.selector("div.toasts")).toExist(),
      Scene.expect(Scene.selector(".toast.error")).toContainText(
        "The server did not answer."
      ),
      Scene.expect(Scene.selector(".toast.ok")).toContainText("Saved")
    );
  });

  const resolveLeave = [
    Scene.Command.resolve(
      Animation.WaitForPaint,
      Animation.Message.CompletedWaitForPaint({ generation: LEAVE_GENERATION })
    ),
    Scene.Command.resolve(
      Animation.WaitForAnimationSettled,
      Animation.Message.EndedAnimation({ generation: LEAVE_GENERATION })
    ),
  ] as const;

  it("names each slip's dismiss button after its title, which takes the slip away", () => {
    Scene.scene(
      { update: Toast.update, view: stackView },
      Scene.given(raise(emptyStack, NOT_SENT)),
      resolveStack,
      Scene.click(Scene.role("button", { name: "Dismiss: Not sent" })),
      ...resolveLeave,
      Scene.expect(Scene.selector(".toast")).toBeAbsent()
    );
  });

  it("keeps the region on the page while it is empty", () => {
    Scene.scene(
      { update: Toast.update, view: stackView },
      Scene.given(emptyStack),
      Scene.Mount.resolveAll(...Toast.sceneMounts),
      Scene.expect(Scene.role("region", { name: "Notifications" })).toExist(),
      Scene.expect(Scene.selector(".toast")).toBeAbsent()
    );
  });
});

const setUp = () => {
  document.body.innerHTML = `<div id="toasts" aria-live="polite"></div><div ${ANNOUNCER_ATTRIBUTE} role="status" aria-live="polite"></div>`;
  const region = document.querySelector(`[${ANNOUNCER_ATTRIBUTE}]`);
  const said: string[] = [];

  const observer = new MutationObserver(() => {
    const text = region?.textContent ?? "";

    if (text !== "") {
      said.push(text);
    }
  });

  if (region !== null) {
    observer.observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  return { said, observer };
};

const move = (): void => {
  requestAnimationFrame(() => {
    const fresh = document.createElement("div");
    fresh.id = "toasts";
    document.querySelector("#toasts")?.replaceWith(fresh);
  });
};

describe("Toast announcement", () => {
  const SPOKEN = "Saved.";

  const SAYING_MILLIS = 60;

  it("leaves a slip to the stack it is added to, which reads it", async () => {
    const { said, observer } = setUp();

    await Effect.runPromise(
      Toast.AnnounceSlip({ stackId: "toasts", text: SPOKEN }).effect
    );
    await settle(SAYING_MILLIS);
    observer.disconnect();

    expect(said).toStrictEqual([]);
  });

  it("says a slip once through the page's live region when the stack moved host", async () => {
    const { said, observer } = setUp();
    move();

    await Effect.runPromise(
      Toast.AnnounceSlip({ stackId: "toasts", text: SPOKEN }).effect
    );
    await settleUntil(() => said.length > 0);
    await settle(SAYING_MILLIS);
    observer.disconnect();

    expect(said).toStrictEqual([SPOKEN]);
  });
});

const renderStack = () => {
  document.body.innerHTML = `
    <button id="page-save">save</button>
    <div id="toasts"><button id="slip-dismiss">dismiss</button><button id="slip-retry">retry</button></div>`;

  return {
    stack: byId("toasts"),
    slip: byId("slip-dismiss"),
    page: byId("page-save"),
  };
};

const focusEvent = (
  type: "focusin" | "focusout",
  relatedTarget: Element
): FocusEvent => new FocusEvent(type, { bubbles: true, relatedTarget });

describe("Toast stack event filters", () => {
  it("notes focus coming in from the page, and where from, but not a move between slips", () => {
    const { stack, slip, page } = renderStack();
    const retry = byId("slip-retry");
    const fromStack = (event: FocusEvent) => stackFocusIn(stack, event);

    expect(
      readDuringDispatch(slip, focusEvent("focusin", page), fromStack, {
        listenOn: stack,
      })
    ).toStrictEqual(
      Option.some(
        Toast.Message.FocusedStack({ maybeFromId: Option.some("page-save") })
      )
    );
    expect(
      readDuringDispatch(slip, focusEvent("focusin", retry), fromStack, {
        listenOn: stack,
      })
    ).toStrictEqual(Option.none());
  });

  it("notes focus leaving for the page, but not a move between slips", () => {
    const { stack, slip, page } = renderStack();
    const retry = byId("slip-retry");
    const toPage = (event: FocusEvent) => stackFocusOut(stack, event);

    expect(
      readDuringDispatch(slip, focusEvent("focusout", page), toPage, {
        listenOn: stack,
      })
    ).toStrictEqual(Option.some(Toast.Message.BlurredStack()));
    expect(
      readDuringDispatch(slip, focusEvent("focusout", retry), toPage, {
        listenOn: stack,
      })
    ).toStrictEqual(Option.none());
  });

  it("takes a plain Escape on a slip, leaving other, modified, composing and handled keys", () => {
    const { stack, slip } = renderStack();

    const press = (
      key: string,
      init: KeyboardEventInit = {},
      isHandled = false
    ) =>
      readDuringDispatch(slip, keydown(key, init), stackKey, {
        listenOn: stack,
        isHandled,
      });

    expect(press("Escape")).toStrictEqual(
      Option.some(Toast.Message.PressedEscape())
    );
    expect(press("Enter")).toStrictEqual(Option.none());
    expect(press("Escape", { ctrlKey: true })).toStrictEqual(Option.none());
    expect(press("Escape", { isComposing: true })).toStrictEqual(Option.none());
    expect(press("Escape", {}, true)).toStrictEqual(Option.none());
  });
});
