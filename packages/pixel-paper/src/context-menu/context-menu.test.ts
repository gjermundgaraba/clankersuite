import { Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { htmlElement } from "../dom/html-element.ts";
import { Focus } from "../focus/focus.ts";
import { action, check } from "../menu/item.ts";
import type { Item } from "../menu/item.ts";
import { disposeEmbedded, embed } from "../test/embed.ts";
import { readDuringDispatch } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import * as ContextMenu from "./context-menu.ts";
import { menuRequest } from "./context-menu.ts";

const ITEMS: readonly Item[] = [
  action({ id: "open", label: "Open" }),
  check({ id: "pinned", label: "Pinned", isChecked: false }),
];

const closedMenu = ContextMenu.init({ id: "row-actions" });
const POINT = { x: 120, y: 48 };

const requested = (
  targetId: string,
  maybeReturnFocusId: Option.Option<string>
) =>
  ContextMenu.Message.RequestedMenu({
    point: POINT,
    targetId,
    maybeReturnFocusId,
  });

const openMenu = ContextMenu.update(
  closedMenu,
  requested("row-2", Option.some("row-2"))
).model;

describe("ContextMenu update", () => {
  it("opens for the target that asked, at its point", () => {
    expect(Option.isSome(openMenu.maybeOpening)).toBe(true);
    expect(ContextMenu.targetId(openMenu)).toStrictEqual(Option.some("row-2"));
    expect(ContextMenu.targetId(closedMenu)).toStrictEqual(Option.none());
  });

  it("reports a choice with its target and puts focus back where it was", () => {
    Story.story(
      ContextMenu.update,
      Story.given(openMenu),
      Story.message(
        ContextMenu.Message.SelectedItem({ id: "open", kind: "Action" })
      ),
      Story.expectOutMessage(
        ContextMenu.OutMessage.Selected({ id: "open", targetId: "row-2" })
      ),
      Story.Command.expectExact(Focus({ id: "row-2" })),
      Story.Command.resolve(Focus, ContextMenu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(Option.isSome(model.maybeOpening)).toBe(false);
      })
    );
  });

  it("toggles a check row in place, and closes on Escape without a focus to return to", () => {
    Story.story(
      ContextMenu.update,
      Story.given(
        ContextMenu.update(closedMenu, requested("row-3", Option.none())).model
      ),
      Story.message(
        ContextMenu.Message.SelectedItem({ id: "pinned", kind: "Check" })
      ),
      Story.expectOutMessage(
        ContextMenu.OutMessage.Toggled({ id: "pinned", targetId: "row-3" })
      ),
      Story.message(ContextMenu.Message.PressedEscape()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(Option.isSome(model.maybeOpening)).toBe(false);
      })
    );
  });

  it("closes when its slip leaves the page, but not for a slip an opening anew replaced", () => {
    const unmounted = (targetId: string, point: typeof POINT) =>
      ContextMenu.Message.UnmountedSlip({ targetId, point });

    Story.story(
      ContextMenu.update,
      Story.given(openMenu),
      Story.message(unmounted("row-1", POINT)),
      Story.message(unmounted("row-2", { x: 0, y: 0 })),
      Story.model((model) => {
        expect(ContextMenu.targetId(model)).toStrictEqual(Option.some("row-2"));
      }),
      Story.message(unmounted("row-2", POINT)),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(ContextMenu.targetId(model)).toStrictEqual(Option.none());
      })
    );
  });
});

const Harness = Schema.Struct({
  menu: ContextMenu.Model,
  isMenuShown: Schema.Boolean,
});

type Harness = typeof Harness.Type;

const HarnessMessage = defineMessageUnion({
  GotMenuMessage: { message: ContextMenu.Message },
  ClickedLeave: {},
});

type HarnessMessage = typeof HarnessMessage.Type;

const listView = (model: Harness, h: HtmlBuilder<HarnessMessage>) =>
  h.div(
    [],
    [
      h.ul(
        [],
        ["row-1", "row-2"].map((rowId) =>
          h.li(
            [
              h.Id(rowId),
              ContextMenu.target(
                {
                  targetId: rowId,
                  toParentMessage: (message) =>
                    HarnessMessage.GotMenuMessage({ message }),
                },
                h
              ),
            ],
            [rowId]
          )
        )
      ),
      h.submodel({
        slotId: ContextMenu.id(model.menu),
        model: model.menu,
        view: ContextMenu.view,
        viewInputs: { label: "Row actions", items: ITEMS },
        toParentMessage: (message) =>
          HarnessMessage.GotMenuMessage({ message }),
      }),
    ]
  );

const foldMenu = Update.foldChild({
  update: ContextMenu.update,
  read: (model: Harness) => Option.some(model.menu),
  write: (model: Harness, nextMenu: ContextMenu.Model): Harness =>
    modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: (message: ContextMenu.Message) =>
    HarnessMessage.GotMenuMessage({ message }),
  foldOutMessage: ContextMenu.OutMessage.match<
    Update.Step<Harness, HarnessMessage>
  >({
    Selected: () => (model) => ({ model }),
    Toggled: () => (model) => ({ model }),
  }),
});

const harnessUpdate = (model: Harness, message: HarnessMessage) =>
  HarnessMessage.match<Update.Return<Harness, HarnessMessage>>(message, {
    GotMenuMessage: ({ message: menuMessage }) => foldMenu(model, menuMessage),
    ClickedLeave: () => ({
      model: modifyFields(model, { isMenuShown: () => false }),
    }),
  });

describe("ContextMenu view", () => {
  it("serves every row from one slip, a menu named by its label", () => {
    Scene.scene(
      { update: harnessUpdate, view: listView },
      Scene.given<Harness>({ menu: closedMenu, isMenuShown: true }),
      Scene.expect(Scene.role("menu")).toBeAbsent(),
      Scene.Mount.resolve(
        { name: ContextMenu.OpenOnContextMenu.name },
        HarnessMessage.GotMenuMessage({
          message: requested("row-2", Option.none()),
        })
      ),
      Scene.Mount.resolve(
        { name: ContextMenu.OpenOnContextMenu.name },
        HarnessMessage.GotMenuMessage({
          message: requested("row-2", Option.none()),
        })
      ),
      Scene.Mount.resolve(
        ContextMenu.BindPointSlip,
        ContextMenu.Message.CompletedPlaceSlip()
      ),
      Scene.expect(Scene.role("menu", { name: "Row actions" })).toHaveClass(
        "at-point"
      ),
      Scene.expect(Scene.role("menuitem", { name: "Open" })).toExist(),
      Scene.expect(
        Scene.role("menuitemcheckbox", { name: "Pinned" })
      ).toHaveAttr("aria-checked", "false")
    );
  });
});

const renderRow = () => {
  document.body.innerHTML = `<div id="row-2" tabindex="0"><input id="row-2-name" /></div>`;

  return { row: byId("row-2"), field: byId("row-2-name") };
};

const contextmenu = (init: MouseEventInit): MouseEvent =>
  new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ...init });

describe("ContextMenu request filter", () => {
  it("asks for the slip at the pointer on a right click, noting the focused element", () => {
    const { row, field } = renderRow();
    field.focus();

    const request = readDuringDispatch(
      field,
      contextmenu({ button: 2, clientX: 120, clientY: 48 }),
      (event) => menuRequest(row, "row-2", event),
      { listenOn: row }
    );

    expect(request).toStrictEqual(
      Option.some(requested("row-2", Option.some("row-2-name")))
    );
  });

  it("asks for it under the target when the keyboard opened it", () => {
    const { row } = renderRow();
    const rect = row.getBoundingClientRect();

    const request = readDuringDispatch(
      row,
      contextmenu({ button: 0, clientX: 999 }),
      (event) => menuRequest(row, "row-2", event)
    );

    expect(Option.map(request, ({ point }) => point)).toStrictEqual(
      Option.some({ x: rect.left, y: rect.bottom })
    );
  });

  it("leaves a context menu someone already handled alone", () => {
    const { row, field } = renderRow();

    const request = readDuringDispatch(
      field,
      contextmenu({ button: 2 }),
      (event) => menuRequest(row, "row-2", event),
      { listenOn: row, isHandled: true }
    );

    expect(request).toStrictEqual(Option.none());
  });
});

const leavingView = (model: Harness, h: HtmlBuilder<HarnessMessage>) =>
  h.div(
    [
      h.DataAttribute(
        "menu-target",
        Option.getOrElse(ContextMenu.targetId(model.menu), () => "none")
      ),
    ],
    [
      ...(model.isMenuShown
        ? [
            h.submodel({
              slotId: ContextMenu.id(model.menu),
              model: model.menu,
              view: ContextMenu.view,
              viewInputs: { label: "Row actions", items: ITEMS },
              toParentMessage: (message) =>
                HarnessMessage.GotMenuMessage({ message }),
            }),
          ]
        : []),
      h.button(
        [h.Id("leave"), h.OnClick(HarnessMessage.ClickedLeave())],
        ["Leave"]
      ),
    ]
  );

const menuTarget = (): string | undefined =>
  Option.getOrUndefined(
    Option.flatMapNullishOr(
      htmlElement("[data-menu-target]"),
      (target) => target.dataset["menuTarget"]
    )
  );

describe("ContextMenu slip leaving the page", () => {
  afterEach(disposeEmbedded);

  it("closes when the slip leaves the page while it is open", async () => {
    embed({
      Model: Harness,
      init: () => ({ model: { menu: openMenu, isMenuShown: true } }),
      update: harnessUpdate,
      view: leavingView,
    });
    await settleUntil(
      () => document.querySelector("#row-actions-slip") !== null
    );
    expect(menuTarget()).toBe("row-2");

    byId("leave").click();
    await settleUntil(() => menuTarget() === "none");
    expect(menuTarget()).toBe("none");
  });
});
