import { ContextMenu, Menu } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as MenusExample from "./menus.ts";

const resolveFocus = Story.Command.resolve(
  Menu.Focus,
  Menu.Message.CompletedFocus()
);

const pinRow = MenusExample.Message.GotRowActionsMessage({
  rowId: "row-notes",
  message: Menu.Message.SelectedItem({ id: "pin", kind: "Check" }),
});

describe("Menu examples", () => {
  it("sets the scheme from the settings menu's radio rows, and notes any other row", () => {
    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(
        MenusExample.Message.GotSettingsMessage({
          message: Menu.Message.SelectedItem({ id: "Plum", kind: "Radio" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.scheme).toBe("Plum");
        expect(model.maybeLastAction).toStrictEqual(Option.none());
      }),
      Story.message(
        MenusExample.Message.GotSettingsMessage({
          message: Menu.Message.SelectedItem({ id: "sign-out", kind: "Link" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.scheme).toBe("Plum");
        expect(model.maybeLastAction).toStrictEqual(Option.some("sign-out"));
      })
    );
  });

  it("pins a row from its actions menu, and unpins it", () => {
    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(pinRow),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual(["row-notes"]);
        expect(model.maybeLastAction).toStrictEqual(
          Option.some("pin row-notes")
        );
      }),
      Story.message(pinRow),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual([]);
      })
    );
  });

  it("pins a row from its context menu, and unpins it", () => {
    const pinFromContextMenu = MenusExample.Message.GotRowMenuMessage({
      message: ContextMenu.Message.SelectedItem({ id: "pin", kind: "Check" }),
    });

    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(
        MenusExample.Message.GotRowMenuMessage({
          message: ContextMenu.Message.RequestedMenu({
            point: { x: 40, y: 40 },
            targetId: "row-budget",
            maybeReturnFocusId: Option.none(),
          }),
        })
      ),
      Story.message(pinFromContextMenu),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual(["row-budget"]);
      }),
      Story.message(pinFromContextMenu),
      Story.model((model) => {
        expect(model.pinnedIds).toStrictEqual([]);
      })
    );
  });

  it("turns dense rows on and off from the settings menu's check row", () => {
    const toggleDense = MenusExample.Message.GotSettingsMessage({
      message: Menu.Message.SelectedItem({ id: "dense", kind: "Check" }),
    });

    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(toggleDense),
      Story.model((model) => {
        expect(model.isDense).toBe(true);
      }),
      Story.message(toggleDense),
      Story.model((model) => {
        expect(model.isDense).toBe(false);
      })
    );
  });

  it("notes what the New menu would make", () => {
    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(
        MenusExample.Message.GotCreateMessage({
          message: Menu.Message.SelectedItem({ id: "task", kind: "Action" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeLastAction).toStrictEqual(Option.some("new task"));
      })
    );
  });

  it("picks the area the primary toggle shows", () => {
    Story.story(
      MenusExample.update,
      Story.given(MenusExample.init()),
      Story.message(
        MenusExample.Message.GotAreaPickerMessage({
          message: Menu.Message.SelectedItem({ id: "research", kind: "Radio" }),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.area.id).toBe("research");
      })
    );
  });
});
