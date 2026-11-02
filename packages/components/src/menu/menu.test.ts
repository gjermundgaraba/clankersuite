import { Effect, Fiber, Option, Schema, Stream } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { afterEach, assert, describe, expect, it } from "vite-plus/test";

import { htmlElement } from "../dom/html-element.ts";
import { Focus } from "../focus/focus.ts";
import { disposeEmbedded, embed } from "../test/embed.ts";
import { keydown, readDuringDispatch } from "../test/events.ts";
import { byId, renderOnPage } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import { action, check, group, link, radio } from "./item.ts";
import type { Item } from "./item.ts";
import { toggleKey } from "./menu.ts";
import * as Menu from "./menu.ts";

const SETTINGS: readonly Item[] = [
  group("Appearance", [
    radio({ id: "system", label: "System", isChecked: false }),
    radio({ id: "paper", label: "Paper", isChecked: true }),
    radio({ id: "plum", label: "Plum", isChecked: false }),
  ]),
  group("Layout", [
    check({ id: "dense", label: "Dense rows", isChecked: true }),
  ]),
  action({ id: "export", label: "Export", isDisabled: true }),
  group("Account", [
    link({ id: "sign-out", label: "Sign out", href: "/sign-out" }),
  ]),
];

const NEW: readonly Item[] = [
  action({
    id: "task",
    label: "Task",
    keyHint: { keys: "N", platform: "Other" },
  }),
  action({ id: "area", label: "Area" }),
];

const closedMenu = Menu.init({ id: "settings" });
const openMenu = Menu.update(closedMenu, Menu.Message.ClickedToggle()).model;

describe("Menu update", () => {
  it("opens on its first row from a click, on its last from ↑, and closes on a second click", () => {
    Story.story(
      Menu.update,
      Story.given(closedMenu),
      Story.message(Menu.Message.ClickedToggle()),
      Story.model((model) => {
        expect(Menu.isOpen(model)).toBe(true);
        expect(model.edge).toBe("First");
      }),
      Story.message(Menu.Message.ClickedToggle()),
      Story.model((model) => {
        expect(Menu.isOpen(model)).toBe(false);
      }),
      Story.message(Menu.Message.PressedToggleArrow({ edge: "Last" })),
      Story.model((model) => {
        expect(model.edge).toBe("Last");
      }),
      Story.message(Menu.Message.PressedToggleArrow({ edge: "First" })),
      Story.Command.expectExact(
        Menu.FocusEdge({ slipId: "settings-slip", edge: "First" })
      ),
      Story.Command.resolve(Menu.FocusEdge, Menu.Message.CompletedFocusEdge())
    );
  });

  it("reports an action, a radio row or a link by its id, closes, and puts focus back", () => {
    for (const kind of ["Action", "Radio", "Link"] as const) {
      Story.story(
        Menu.update,
        Story.given(openMenu),
        Story.message(Menu.Message.SelectedItem({ id: "plum", kind })),
        Story.expectOutMessage(Menu.OutMessage.Selected({ id: "plum" })),
        Story.model((model) => {
          expect(model.isOpen).toBe(false);
        }),
        Story.Command.expectExact(Focus({ id: "settings-toggle" })),
        Story.Command.resolve(Focus, Menu.Message.CompletedFocus())
      );
    }
  });

  it("reports a check row as toggled and stays open", () => {
    Story.story(
      Menu.update,
      Story.given(openMenu),
      Story.message(Menu.Message.SelectedItem({ id: "dense", kind: "Check" })),
      Story.expectOutMessage(Menu.OutMessage.Toggled({ id: "dense" })),
      Story.model((model) => {
        expect(model.isOpen).toBe(true);
      }),
      Story.Command.expectNone()
    );
  });

  it("closes on Escape and Tab with focus back on the toggle, and leaves focus where a click put it", () => {
    for (const message of [
      Menu.Message.PressedEscape(),
      Menu.Message.PressedTab(),
    ]) {
      Story.story(
        Menu.update,
        Story.given(openMenu),
        Story.message(message),
        Story.Command.expectExact(Focus({ id: "settings-toggle" })),
        Story.Command.resolve(Focus, Menu.Message.CompletedFocus())
      );
    }

    Story.story(
      Menu.update,
      Story.given(openMenu),
      Story.message(Menu.Message.LeftSlip()),
      Story.model((model) => {
        expect(model.isOpen).toBe(false);
      }),
      Story.Command.expectNone()
    );
  });

  it("closes without moving focus when its slip leaves the page, and stays closed", () => {
    Story.story(
      Menu.update,
      Story.given(openMenu),
      Story.message(Menu.Message.UnmountedSlip()),
      Story.model((model) => {
        expect(Menu.isOpen(model)).toBe(false);
      }),
      Story.Command.expectNone(),
      Story.message(Menu.Message.UnmountedSlip()),
      Story.model((model) => {
        expect(Menu.isOpen(model)).toBe(false);
      }),
      Story.Command.expectNone()
    );
  });
});

const menuView =
  (items: readonly Item[], viewInputs: Partial<Menu.ViewInputs> = {}) =>
  (model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
    Menu.view(model, { label: "Settings", items, ...viewInputs }, h);

const resolveToggle = Scene.Mount.resolve(
  Menu.BindToggleKeys,
  Menu.Message.PressedToggleArrow({ edge: "First" })
);

const resolveSlip = Scene.Mount.resolve(
  Menu.BindSlip,
  Menu.Message.CompletedPlaceSlip()
);

const resolveFocusEdge = Scene.Command.resolve(
  Menu.FocusEdge,
  Menu.Message.CompletedFocusEdge()
);

const resolveOpen = [resolveToggle, resolveFocusEdge, resolveSlip] as const;

const toggle = (name: string) => Scene.role("button", { name });

describe("Menu toggle", () => {
  it("is a small button that says it opens a menu, collapsed until opened", () => {
    Scene.scene(
      { update: Menu.update, view: menuView(SETTINGS) },
      Scene.given(closedMenu),
      Scene.expect(toggle("Settings")).toHaveAttr("aria-haspopup", "menu"),
      Scene.expect(toggle("Settings")).toHaveAttr("aria-expanded", "false"),
      Scene.expect(toggle("Settings")).toHaveClass("btn"),
      Scene.expect(toggle("Settings")).toHaveClass("small"),
      Scene.expect(Scene.role("menu")).toBeAbsent(),
      resolveToggle,
      resolveSlip,
      Scene.expect(Scene.role("menu", { name: "Settings" })).toExist()
    );
  });

  it("names a glyph toggle by its label and gives it the label as its tip", () => {
    Scene.scene(
      {
        update: Menu.update,
        view: menuView(NEW, { label: "More", glyph: "more", isQuiet: true }),
      },
      Scene.given(closedMenu),
      Scene.expect(toggle("More")).toHaveAttr("data-tip", "More"),
      Scene.expect(toggle("More")).toHaveClass("iconbtn"),
      Scene.expect(toggle("More")).toHaveClass("quiet"),
      resolveToggle,
      resolveSlip,
      Scene.expect(Scene.role("menu", { name: "More" })).toExist()
    );
  });

  it("prints composed content in a primary toggle named by its label", () => {
    Scene.scene(
      {
        update: Menu.update,
        view: (model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
          Menu.view(
            model,
            {
              label: "Select area",
              items: NEW,
              variant: "Primary",
              toggleContent: [
                h.span([h.Class("area-title")], ["Home"]),
                h.span([h.Class("count")], ["3"]),
              ],
            },
            h
          ),
      },
      Scene.given(closedMenu),
      Scene.expect(toggle("Select area")).toHaveClass("primary"),
      Scene.expect(Scene.selector("#settings-toggle .area-title")).toHaveText(
        "Home"
      ),
      resolveToggle,
      resolveSlip
    );
  });
});

describe("Menu slip", () => {
  it("is a menu named by its toggle, its radio rows checked one at a time", () => {
    Scene.scene(
      { update: Menu.update, view: menuView(SETTINGS) },
      Scene.given(openMenu),
      ...resolveOpen,
      Scene.expect(toggle("Settings")).toHaveAttr("aria-expanded", "true"),
      Scene.expect(toggle("Settings")).toHaveAttr(
        "aria-controls",
        "settings-slip"
      ),
      Scene.expect(Scene.role("menu", { name: "Settings" })).toExist(),
      Scene.expect(Scene.role("group", { name: "Appearance" })).toExist(),
      Scene.expectAll(Scene.all.role("menuitemradio")).toHaveCount(3),
      Scene.expect(Scene.role("menuitemradio", { name: "Paper" })).toHaveAttr(
        "aria-checked",
        "true"
      ),
      Scene.expect(Scene.role("menuitemradio", { name: "Plum" })).toHaveAttr(
        "aria-checked",
        "false"
      ),
      Scene.click(Scene.role("menuitemradio", { name: "Plum" })),
      Scene.expectOutMessage(Menu.OutMessage.Selected({ id: "plum" })),
      Scene.Command.resolve(Focus, Menu.Message.CompletedFocus()),
      Scene.Mount.expectEnded(Menu.BindSlip)
    );
  });

  it("keeps every row out of the tab order: the arrows move between them", () => {
    Scene.scene(
      { update: Menu.update, view: menuView(SETTINGS) },
      Scene.given(openMenu),
      ...resolveOpen,
      Scene.expect(Scene.role("menuitemradio", { name: "Paper" })).toHaveAttr(
        "tabIndex",
        "-1"
      ),
      Scene.expect(
        Scene.role("menuitemcheckbox", { name: "Dense rows" })
      ).toHaveAttr("tabIndex", "-1"),
      Scene.expect(Scene.role("menuitem", { name: "Export" })).toHaveAttr(
        "tabIndex",
        "-1"
      ),
      Scene.expect(Scene.role("menuitem", { name: "Sign out" })).toHaveAttr(
        "tabIndex",
        "-1"
      )
    );
  });

  it("says a check row's state and keeps the slip open when it is chosen", () => {
    Scene.scene(
      { update: Menu.update, view: menuView(SETTINGS) },
      Scene.given(openMenu),
      ...resolveOpen,
      Scene.expect(
        Scene.role("menuitemcheckbox", { name: "Dense rows" })
      ).toHaveAttr("aria-checked", "true"),
      Scene.click(Scene.role("menuitemcheckbox", { name: "Dense rows" })),
      Scene.expectOutMessage(Menu.OutMessage.Toggled({ id: "dense" })),
      Scene.expect(Scene.role("menu")).toExist()
    );
  });

  it("makes a link a menu item with its href", () => {
    Scene.scene(
      { update: Menu.update, view: menuView(SETTINGS) },
      Scene.given(openMenu),
      ...resolveOpen,
      Scene.expect(Scene.role("group", { name: "Account" })).toExist(),
      Scene.expect(Scene.role("menuitem", { name: "Sign out" })).toHaveAttr(
        "href",
        "/sign-out"
      )
    );
  });

  it("holds an unavailable row and shows a key hint", () => {
    Scene.scene(
      { update: Menu.update, view: menuView([...SETTINGS, ...NEW]) },
      Scene.given(openMenu),
      ...resolveOpen,
      Scene.expect(Scene.role("menuitem", { name: "Export" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(
        Scene.role("menuitem", { name: "Export" })
      ).not.toHaveHandler("click"),
      Scene.expect(Scene.selector('[role="menuitem"] kbd.key-hint')).toHaveText(
        "n"
      ),
      Scene.click(Scene.role("menuitem", { name: "Task" })),
      Scene.expectOutMessage(Menu.OutMessage.Selected({ id: "task" })),
      Scene.Command.resolve(Focus, Menu.Message.CompletedFocus()),
      Scene.Mount.expectEnded(Menu.BindSlip)
    );
  });
});

const element = <A extends Element>(selector: string, type: new () => A): A => {
  const found = document.querySelector(selector);
  assert(found instanceof type, `The rendered view has no ${selector}.`);

  return found;
};

const press = (
  target: Element,
  key: string,
  init: KeyboardEventInit = {}
): KeyboardEvent => {
  const event = keydown(key, init);
  target.dispatchEvent(event);

  return event;
};

const collect = async <A>(
  stream: Stream.Stream<A>,
  count: number,
  act: () => void
): Promise<A[]> => {
  const collected: A[] = [];

  const fiber = Effect.runFork(
    Stream.runForEach(stream, (message) =>
      Effect.sync(() => collected.push(message))
    )
  );

  await settleUntil(() => collected.length > 0);
  act();
  await settleUntil(() => collected.length >= count);
  await Effect.runPromise(Fiber.interrupt(fiber));

  return collected;
};

const focusedLabel = (): string =>
  document.activeElement?.textContent?.trim() ?? "";

describe("Menu keys", () => {
  it("moves real focus with the arrows, wrapping and stopping on an unavailable row", async () => {
    await renderOnPage(
      openMenu,
      menuView([
        ...NEW,
        action({ id: "export", label: "Export", isDisabled: true }),
      ])
    );
    const slip = element("#settings-slip", HTMLElement);

    const messages = await collect(
      Menu.BindSlip({
        toggleId: "settings-toggle",
        isEnd: false,
        edge: "First",
      }).f(slip, Mount.liveViewStateChanges),
      2,
      () => {
        element(
          "#settings-slip [data-pixel-paper-slip-first]",
          HTMLElement
        ).focus();
        const moves: string[] = [];
        const down = press(slip, "ArrowDown");
        moves.push(focusedLabel());
        press(slip, "ArrowDown");
        moves.push(focusedLabel());
        press(slip, "ArrowDown");
        moves.push(focusedLabel());
        press(slip, "End");
        moves.push(focusedLabel());
        press(slip, "Home");
        moves.push(focusedLabel());
        press(slip, "a");
        moves.push(focusedLabel());
        press(slip, "ArrowUp", { isComposing: true });
        moves.push(focusedLabel());
        expect(moves).toStrictEqual([
          "Area",
          "Export",
          "Taskn",
          "Export",
          "Taskn",
          "Area",
          "Area",
        ]);
        expect(down.defaultPrevented).toBe(true);
        expect(press(slip, "Escape").defaultPrevented).toBe(true);
      }
    );

    expect(messages).toStrictEqual([
      Menu.Message.CompletedPlaceSlip(),
      Menu.Message.PressedEscape(),
    ]);
  });

  it("reports Tab, and focus leaving for elsewhere but not for the toggle", async () => {
    await renderOnPage(openMenu, menuView(NEW));
    const slip = element("#settings-slip", HTMLElement);
    const toggleButton = element("#settings-toggle", HTMLButtonElement);
    const outside = document.createElement("button");
    document.body.append(outside);

    const messages = await collect(
      Menu.BindSlip({
        toggleId: "settings-toggle",
        isEnd: false,
        edge: "First",
      }).f(slip, Mount.liveViewStateChanges),
      3,
      () => {
        element(
          "#settings-slip [data-pixel-paper-slip-first]",
          HTMLElement
        ).focus();
        toggleButton.focus();
        element(
          "#settings-slip [data-pixel-paper-slip-first]",
          HTMLElement
        ).focus();
        press(slip, "Tab");
        outside.focus();
      }
    );

    expect(messages).toStrictEqual([
      Menu.Message.CompletedPlaceSlip(),
      Menu.Message.PressedTab(),
      Menu.Message.LeftSlip(),
    ]);
  });
});

const pressToggle = (
  key: string,
  init: KeyboardEventInit = {},
  isHandled = false
): ReturnType<typeof toggleKey> => {
  document.body.innerHTML = `<button id="settings-toggle">settings</button>`;

  return readDuringDispatch(
    byId("settings-toggle"),
    keydown(key, init),
    toggleKey,
    {
      isHandled,
    }
  );
};

describe("Menu toggle key filter", () => {
  it("opens on the first row for ↓ and the last for ↑", () => {
    expect(pressToggle("ArrowDown")).toStrictEqual(
      Option.some(Menu.Message.PressedToggleArrow({ edge: "First" }))
    );
    expect(pressToggle("ArrowUp")).toStrictEqual(
      Option.some(Menu.Message.PressedToggleArrow({ edge: "Last" }))
    );
  });

  it("leaves other keys, modified, composing and handled arrows alone", () => {
    expect(pressToggle("Enter")).toStrictEqual(Option.none());
    expect(pressToggle("Home")).toStrictEqual(Option.none());
    expect(pressToggle("ArrowDown", { shiftKey: true })).toStrictEqual(
      Option.none()
    );
    expect(pressToggle("ArrowDown", { altKey: true })).toStrictEqual(
      Option.none()
    );
    expect(pressToggle("ArrowDown", { isComposing: true })).toStrictEqual(
      Option.none()
    );
    expect(pressToggle("ArrowDown", {}, true)).toStrictEqual(Option.none());
  });
});

const RowHarness = Schema.Struct({
  menu: Menu.Model,
  isRowShown: Schema.Boolean,
});

type RowHarness = typeof RowHarness.Type;

const RowHarnessMessage = defineMessageUnion({
  GotMenuMessage: { message: Menu.Message },
  ClickedRemoveRow: {},
});

type RowHarnessMessage = typeof RowHarnessMessage.Type;

const foldRowMenu = Update.foldChild({
  update: Menu.update,
  read: (model: RowHarness) => Option.some(model.menu),
  write: (model: RowHarness, nextMenu: Menu.Model): RowHarness =>
    modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: (message: Menu.Message) =>
    RowHarnessMessage.GotMenuMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<
    Update.Step<RowHarness, RowHarnessMessage>
  >({
    Selected: () => (model) => ({ model }),
    Toggled: () => (model) => ({ model }),
  }),
});

const rowHarnessUpdate = (model: RowHarness, message: RowHarnessMessage) =>
  RowHarnessMessage.match<Update.Return<RowHarness, RowHarnessMessage>>(
    message,
    {
      GotMenuMessage: ({ message: menuMessage }) =>
        foldRowMenu(model, menuMessage),
      ClickedRemoveRow: () => ({
        model: modifyFields(model, { isRowShown: () => false }),
      }),
    }
  );

const rowHarnessView = (model: RowHarness, h: HtmlBuilder<RowHarnessMessage>) =>
  h.div(
    [h.DataAttribute("menu-open", `${Menu.isOpen(model.menu)}`)],
    [
      ...(model.isRowShown
        ? [
            h.div(
              [h.Class("row")],
              [
                h.submodel({
                  slotId: Menu.id(model.menu),
                  model: model.menu,
                  view: Menu.view,
                  viewInputs: { label: "Row actions", items: NEW },
                  toParentMessage: (message) =>
                    RowHarnessMessage.GotMenuMessage({ message }),
                }),
              ]
            ),
          ]
        : []),
      h.button(
        [h.Id("remove-row"), h.OnClick(RowHarnessMessage.ClickedRemoveRow())],
        ["Remove"]
      ),
    ]
  );

const isMenuOpen = (): string | undefined =>
  Option.getOrUndefined(
    Option.flatMapNullishOr(
      htmlElement("[data-menu-open]"),
      (harness) => harness.dataset["menuOpen"]
    )
  );

describe("Menu slip leaving the page", () => {
  afterEach(disposeEmbedded);

  it("closes the menu when the row it sits on is removed while it is open", async () => {
    embed({
      Model: RowHarness,
      init: () => ({ model: { menu: openMenu, isRowShown: true } }),
      update: rowHarnessUpdate,
      view: rowHarnessView,
    });
    await settleUntil(() => document.querySelector("#settings-slip") !== null);
    expect(isMenuOpen()).toBe("true");

    byId("remove-row").click();
    await settleUntil(() => isMenuOpen() === "false");

    expect(document.querySelector("#settings-toggle")).toBeNull();
    expect(isMenuOpen()).toBe("false");
  });
});
