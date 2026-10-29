import { Effect, Option } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { byId } from "../test/fixture.ts";
import * as Rail from "./rail.ts";

import STYLESHEET from "../pixel-paper.css?raw";
import TOKENS from "../tokens.css?raw";

const fresh = Rail.init({ id: "collections" });
const opened = Rail.update(fresh, Rail.Message.ClickedOpen()).model;

const resolveHide = (isReturningFocus: boolean) =>
  Story.Command.resolve(
    Rail.HideRailDrawer({
      railId: "collections",
      buttonId: "collections-open",
      isReturningFocus,
    }),
    Rail.Message.CompletedHideRailDrawer()
  );

describe("Rail update", () => {
  it("closes the drawer, focus left alone, when the window grows past it", () => {
    Story.story(
      Rail.update,
      Story.given(opened),
      Story.message(Rail.Message.WidenedPastDrawer()),
      resolveHide(false)
    );
  });
});

const railViewWith =
  (maybeWidth: Option.Option<number>, isHidden: boolean) =>
  (model: Rail.Model, h: HtmlBuilder<Rail.Message>) =>
    Rail.view(
      model,
      {
        label: "collections",
        maybeWidth,
        isHidden,
        maybeToggleKeyHint: Option.some({ keys: "Mod+B", platform: "Apple" }),
        toAsideView: (toggle) => [
          h.section(
            [h.Class("panel")],
            [
              h.header(
                [h.Class("panel-tb")],
                [h.span([h.Class("panel-lead")], [toggle])]
              ),
              h.a([h.Href("#inbox")], ["Inbox"]),
            ]
          ),
        ],
        toDeckView: (openButton) =>
          h.div([h.Class("deck")], [openButton, h.p([], ["the deck"])]),
      },
      h
    );

const railViewAt = (maybeWidth: Option.Option<number>) =>
  railViewWith(maybeWidth, false);

const railView = railViewAt(Option.none());

const openButton = Scene.role("button", { name: "collections" });

const resized = (width: number) => Rail.OutMessage.ResizedRail({ width });

describe("Rail splitter", () => {
  const press = Rail.Message.PressedSplitter({
    pointerId: 1,
    clientX: 272,
    width: 272,
  });

  it("previews a dragged width and asks for it when let go, within its bounds", () => {
    Story.story(
      Rail.update,
      Story.given(fresh),
      Story.message(press),
      Story.message(Rail.Message.MovedSplitter({ clientX: 330 })),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(
          Option.map(model.maybeResizing, ({ width }) => width)
        ).toStrictEqual(Option.some(330));
      }),
      Story.message(Rail.Message.MovedSplitter({ clientX: 2000 })),
      Story.model((model) => {
        expect(
          Option.map(model.maybeResizing, ({ width }) => width)
        ).toStrictEqual(Option.some(480));
      }),
      Story.message(Rail.Message.ReleasedSplitter({ clientX: 10.4 })),
      Story.expectOutMessage(resized(220)),
      Story.model((model) => {
        expect(model.maybeResizing).toStrictEqual(Option.none());
      })
    );
  });

  it("asks for nothing when let go where it was, or on Escape or a cancel", () => {
    Story.story(
      Rail.update,
      Story.given(fresh),
      Story.message(press),
      Story.message(Rail.Message.ReleasedSplitter({ clientX: 272 })),
      Story.expectNoOutMessage(),
      Story.message(press),
      Story.message(Rail.Message.MovedSplitter({ clientX: 300 })),
      Story.message(Rail.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      Story.message(press),
      Story.message(Rail.Message.CancelledSplitter()),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.maybeResizing).toStrictEqual(Option.none());
      })
    );
  });

  it("is a named separator valued in pixels, stepped 16px by the side arrows", () => {
    const splitter = Scene.role("separator", { name: "Width of collections" });
    Scene.scene(
      { update: Rail.update, view: railViewAt(Option.some(300)) },
      Scene.given(fresh),
      Scene.expect(splitter).toHaveClass("rail-resize"),
      Scene.expect(splitter).toHaveAttr("aria-orientation", "vertical"),
      Scene.expect(splitter).toHaveAttr("aria-controls", "collections"),
      Scene.expect(splitter).toHaveAttr("aria-valuemin", "220"),
      Scene.expect(splitter).toHaveAttr("aria-valuemax", "480"),
      Scene.expect(splitter).toHaveAttr("aria-valuenow", "300"),
      Scene.expect(splitter).toHaveAttr("aria-valuetext", "300 pixels"),
      Scene.expect(Scene.selector(".railed")).toHaveStyle(
        "--railed-width",
        "300px"
      ),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer()),
      Scene.keydown(splitter, "ArrowRight"),
      Scene.expectOutMessage(resized(316)),
      Scene.keydown(splitter, "ArrowLeft"),
      Scene.expectOutMessage(resized(284))
    );
  });

  it("leaves the stylesheet's width alone until the reader gives one, and bounds one given", () => {
    Scene.scene(
      { update: Rail.update, view: railView },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".railed")).not.toHaveAttr("style"),
      Scene.expect(Scene.role("separator")).toHaveAttr(
        "aria-valuenow",
        `${Rail.WIDTH.start}`
      ),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer())
    );
    Scene.scene(
      { update: Rail.update, view: railViewAt(Option.some(9000)) },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".railed")).toHaveStyle(
        "--railed-width",
        "480px"
      ),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer())
    );
  });
});

describe("Rail view", () => {
  it("is one aside named by its label, a popover, beside the deck its button opens", () => {
    Scene.scene(
      { update: Rail.update, view: railView },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".railed")).toExist(),
      Scene.expect(
        Scene.role("complementary", { name: "collections" })
      ).toHaveAttr("popover", "auto"),
      Scene.expect(
        Scene.role("complementary", { name: "collections" })
      ).toHaveClass("rail"),
      Scene.expect(Scene.selector(".rail .rail-head .label")).toHaveText(
        "collections"
      ),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "false"),
      Scene.expect(openButton).toHaveAttr("aria-controls", "collections"),
      Scene.expect(
        Scene.selector(".deck .rail-open button.btn.small")
      ).toExist(),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer()),
      Scene.Command.expectNone(),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "false")
    );
  });

  it("shuts when the browser closes it, and opens and shuts from its button and glyph", () => {
    Scene.scene(
      { update: Rail.update, view: railView },
      Scene.given(opened),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer()),
      Scene.Command.resolve(
        Rail.HideRailDrawer({
          railId: "collections",
          buttonId: "collections-open",
          isReturningFocus: true,
        }),
        Rail.Message.CompletedHideRailDrawer()
      ),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "false"),
      Scene.click(openButton),
      Scene.Command.resolve(
        Rail.ShowRailDrawer,
        Rail.Message.CompletedShowRailDrawer()
      ),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "true"),
      Scene.click(Scene.role("button", { name: "Close" })),
      Scene.Command.resolve(
        Rail.HideRailDrawer({
          railId: "collections",
          buttonId: "collections-open",
          isReturningFocus: true,
        }),
        Rail.Message.CompletedHideRailDrawer()
      ),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "false")
    );
  });

  it("closes, focus left where it went, when focus leaves the open drawer", () => {
    Scene.scene(
      { update: Rail.update, view: railView },
      Scene.given(opened),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "true"),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.BlurredDrawer()),
      Scene.Command.resolve(
        Rail.HideRailDrawer({
          railId: "collections",
          buttonId: "collections-open",
          isReturningFocus: false,
        }),
        Rail.Message.CompletedHideRailDrawer()
      ),
      Scene.expect(openButton).toHaveAttr("aria-expanded", "false")
    );
  });
});

const resolveFocusToggle = Scene.Command.resolve(
  Rail.FocusRailToggle({
    railId: "collections",
    toggleId: "collections-toggle",
  }),
  Rail.Message.CompletedFocusRailToggle()
);

describe("Rail toggle", () => {
  const hideButton = Scene.role("button", { name: "Hide collections" });
  const showButton = Scene.role("button", { name: "Show collections" });

  it("asks the parent to fold the rail, and moves focus in the rail to the toggle", () => {
    Story.story(
      Rail.update,
      Story.given(fresh),
      Story.message(Rail.Message.ClickedToggle()),
      Story.expectOutMessage(Rail.OutMessage.ToggledRail()),
      Story.Command.resolve(
        Rail.FocusRailToggle({
          railId: "collections",
          toggleId: "collections-toggle",
        }),
        Rail.Message.CompletedFocusRailToggle()
      ),
      Story.model((model) => {
        expect(model).toStrictEqual(fresh);
      })
    );
  });

  it("moves focus to the toggle for a key of the parent's, asking nothing", () => {
    const { model, commands } = Rail.toggle(fresh);

    expect(model).toStrictEqual(fresh);
    expect(commands?.map(({ name }) => name)).toStrictEqual([
      Rail.FocusRailToggle.name,
    ]);
  });

  it("hands the panels a toggle that names what it does, with the parent's key", () => {
    Scene.scene(
      { update: Rail.update, view: railView },
      Scene.given(fresh),
      Scene.expect(
        Scene.selector(".panel-lead .rail-toggle button.iconbtn.quiet")
      ).toExist(),
      Scene.expect(hideButton).toHaveId("collections-toggle"),
      Scene.expect(hideButton).toHaveAttr("aria-expanded", "true"),
      Scene.expect(hideButton).toHaveAttr("aria-controls", "collections"),
      Scene.expect(hideButton).toHaveAttr("data-tip-key", "⌘B"),
      Scene.expect(Scene.selector(".railed")).not.toHaveClass("folded"),
      Scene.expect(Scene.role("separator")).toExist(),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer()),
      Scene.click(hideButton),
      Scene.expectOutMessage(Rail.OutMessage.ToggledRail()),
      resolveFocusToggle
    );
  });

  it("folds while hidden: the toggle shows it again, the splitter and the width are gone", () => {
    Scene.scene(
      { update: Rail.update, view: railViewWith(Option.some(300), true) },
      Scene.given(fresh),
      Scene.expect(Scene.selector(".railed")).toHaveClass("folded"),
      Scene.expect(Scene.selector(".railed")).not.toHaveAttr("style"),
      Scene.expect(Scene.role("separator")).toBeAbsent(),
      Scene.expect(showButton).toHaveAttr("aria-expanded", "false"),
      Scene.expect(showButton).toHaveAttr("aria-controls", "collections"),
      Scene.expect(
        Scene.role("complementary", { name: "collections" })
      ).toExist(),
      Scene.Mount.resolve(Rail.FollowRailDrawer, Rail.Message.ClosedDrawer()),
      Scene.click(showButton),
      Scene.expectOutMessage(Rail.OutMessage.ToggledRail()),
      resolveFocusToggle
    );
  });
});

const renderFoldingRail = (): void => {
  document.body.innerHTML = `
    <aside id="rail" popover="auto">
      <section class="panel">
        <header class="panel-tb"><span class="panel-lead"><span class="rail-toggle"><button id="toggle" type="button">Hide</button></span></span></header>
        <a id="row" href="#row">a row</a>
      </section>
    </aside>
    <div id="splitter" class="rail-resize" role="separator" aria-controls="rail" tabindex="0"></div>
    <button id="outside">deck</button>`;
};

describe("Rail focus on folding", () => {
  const focusToggle = Rail.FocusRailToggle({
    railId: "rail",
    toggleId: "toggle",
  }).effect;

  it("puts focus that was in the rail on the toggle", async () => {
    renderFoldingRail();
    byId("row").focus();

    await Effect.runPromise(focusToggle);

    expect(document.activeElement).toBe(byId("toggle"));
  });

  it("puts focus that was on the rail's splitter, which folding takes away, on the toggle", async () => {
    renderFoldingRail();
    byId("splitter").focus();

    await Effect.runPromise(focusToggle);

    expect(document.activeElement).toBe(byId("toggle"));
  });

  it("leaves focus outside the rail where it is", async () => {
    renderFoldingRail();
    byId("outside").focus();

    await Effect.runPromise(focusToggle);

    expect(document.activeElement).toBe(byId("outside"));
  });
});

const renderRail = (): HTMLElement => {
  document.body.innerHTML = `
    <aside id="rail" popover="auto">
      <div class="rail-head"><button id="close" type="button">Close</button></div>
      <section>
        <header><span class="rail-toggle"><button id="toggle" type="button">Hide</button></span></header>
        <ul role="tree">
          <li role="none"><button id="first" role="treeitem" tabindex="-1">a</button></li>
          <li role="none"><button id="current" role="treeitem" tabindex="0">b</button></li>
        </ul>
      </section>
    </aside>
    <button id="outside">deck</button>`;

  return byId("rail");
};

describe("Rail drawer events", () => {
  it("hears the browser closing the drawer, and not opening it", () => {
    expect(Rail.drawerToggleMessage({ newState: "closed" })).toStrictEqual(
      Option.some(Rail.Message.ClosedDrawer())
    );
    expect(Rail.drawerToggleMessage({ newState: "open" })).toStrictEqual(
      Option.none()
    );
  });

  it("hears focus leaving the open drawer, and not focus moving inside it", () => {
    const rail = renderRail();

    const leaving = new FocusEvent("focusout", {
      relatedTarget: byId("outside"),
    });

    const inside = new FocusEvent("focusout", {
      relatedTarget: byId("current"),
    });

    expect(Rail.drawerFocusOutMessage(rail, leaving, true)).toStrictEqual(
      Option.some(Rail.Message.BlurredDrawer())
    );
    expect(Rail.drawerFocusOutMessage(rail, inside, true)).toStrictEqual(
      Option.none()
    );
    expect(Rail.drawerFocusOutMessage(rail, leaving, false)).toStrictEqual(
      Option.none()
    );
  });

  it("closes an open drawer when the window grows past the drawer's width", () => {
    expect(Rail.widthChangeMessage(false, true)).toStrictEqual(
      Option.some(Rail.Message.WidenedPastDrawer())
    );
    expect(Rail.widthChangeMessage(true, true)).toStrictEqual(Option.none());
    expect(Rail.widthChangeMessage(false, false)).toStrictEqual(Option.none());
  });

  it("focuses the first Tab stop past the head, passing over the toggle and a tree's other items", () => {
    const rail = renderRail();

    expect(Option.map(Rail.firstTabStop(rail), ({ id }) => id)).toStrictEqual(
      Option.some("current")
    );
  });
});

describe("Rail stylesheet", () => {
  it("passes the reader's width, not inherited, to the boxes it sizes, and falls back to --rail", () => {
    expect(STYLESHEET).toMatch(
      /@property --railed-width \{[^}]*inherits: false;/u
    );
    expect(STYLESHEET).toContain(
      ".railed > :is(.rail, .rail-resize, .bench) {\n  --railed-width: inherit;"
    );
    expect(STYLESHEET.match(/var\(--rail\)/gu)?.length).toBe(4);
    expect(
      STYLESHEET.match(/var\(--railed-width, var\(--rail\)\)/gu)?.length
    ).toBe(4);
  });
});

describe("Rail's copies of the stylesheet", () => {
  it("starts at the --rail token, and folds above and turns into a drawer at the stylesheet's breakpoint", () => {
    expect(/--rail: (?<width>\d+)px;/u.exec(TOKENS)?.groups?.["width"]).toBe(
      `${Rail.WIDTH.start}`
    );

    const railedQueries = Array.from(
      STYLESHEET.matchAll(/@media (?<query>[^{]+) \{\s*\.railed\b/gu),
      (match) => match.groups?.["query"]
    );

    expect(railedQueries).toStrictEqual([
      `not ${Rail.DRAWER_QUERY}`,
      Rail.DRAWER_QUERY,
      Rail.DRAWER_QUERY,
    ]);
  });
});
