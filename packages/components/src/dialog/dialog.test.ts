import { Dialog as UiDialog } from "@foldkit/ui";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { byId, bySelector, pressOn } from "../test/fixture.ts";
import * as Dialog from "./dialog.ts";

const openDialog = Dialog.open(Dialog.init({ id: "rename" })).model;

const heldUpdate = (model: Dialog.Model, message: Dialog.Message) =>
  Dialog.update(model, message, { isCloseHeld: true });

const ACTION_BAR = "data-pixel-paper-action-bar";

const renderActionBar = (): HTMLElement => {
  document.body.innerHTML = `
    <dialog id="rename" open>
      <div class="card-actions" ${ACTION_BAR}>
        <input id="inline-field" />
        <button id="first">first</button>
        <button id="skipped" disabled>skipped</button>
        <button id="held" aria-disabled="true">held</button>
        <span popover><button id="in-menu">in a menu</button></span>
      </div>
      <input id="field" />
    </dialog>`;

  return bySelector(`[${ACTION_BAR}]`);
};

const renderBoundActionBar = (): HTMLElement => {
  const bar = renderActionBar();
  bar.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent) {
      Dialog.moveActionFocus(bar, event);
    }
  });

  return bar;
};

const activeId = (): string | undefined => document.activeElement?.id;

describe("Dialog update", () => {
  it("opens through @foldkit/ui", () => {
    const dialogOpen = Dialog.open(Dialog.init({ id: "rename" }));

    expect(Dialog.isOpen(dialogOpen.model)).toBe(true);
    expect(Dialog.id(dialogOpen.model)).toBe("rename");
    expect(dialogOpen.commands?.map(({ name }) => name)).toStrictEqual([
      UiDialog.ShowDialog.name,
    ]);
  });

  it("reports Closed when Escape or the veil asks to close", () => {
    Story.story(
      Dialog.update,
      Story.given(openDialog),
      Story.message(
        Dialog.Message.GotDialogMessage({
          message: UiDialog.Message.RequestedClose(),
        })
      ),
      Story.expectOutMessage(Dialog.OutMessage.Closed()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(Dialog.isOpen(model)).toBe(false);
      })
    );
  });

  it("stays open and reports nothing for Escape or the veil while its ways out are held", () => {
    Story.story(
      heldUpdate,
      Story.given(openDialog),
      Story.message(
        Dialog.Message.GotDialogMessage({
          message: UiDialog.Message.RequestedClose(),
        })
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(Dialog.isOpen(model)).toBe(true);
      })
    );
  });
});

describe("Dialog action bar keys", () => {
  it("moves focus between the bar's actions, passing over a disabled one", () => {
    renderBoundActionBar();

    const forward = pressOn("first", "l");
    expect(activeId()).toBe("held");
    expect(forward.defaultPrevented).toBe(true);

    const back = pressOn("held", "ArrowLeft");
    expect(activeId()).toBe("first");
    expect(back.defaultPrevented).toBe(true);
  });

  it("leaves h typed into a field inside the bar to the field", () => {
    renderBoundActionBar();

    const typed = pressOn("inline-field", "h");

    expect(activeId()).toBe("inline-field");
    expect(typed.defaultPrevented).toBe(false);
  });

  it("leaves the key alone at the end of the bar, in a menu, while composing, or once handled", () => {
    renderBoundActionBar();

    expect(pressOn("held", "l").defaultPrevented).toBe(false);
    expect(activeId()).toBe("held");

    expect(pressOn("in-menu", "h").defaultPrevented).toBe(false);
    expect(activeId()).toBe("in-menu");

    expect(pressOn("first", "l", { isComposing: true }).defaultPrevented).toBe(
      false
    );
    expect(activeId()).toBe("first");

    expect(pressOn("first", "l", { ctrlKey: true }).defaultPrevented).toBe(
      false
    );
    expect(activeId()).toBe("first");

    const handledFirst = byId("first");
    handledFirst.addEventListener(
      "keydown",
      (event) => {
        event.preventDefault();
      },
      { once: true }
    );
    pressOn("first", "l");
    expect(activeId()).toBe("first");
  });
});

const dialogView =
  (
    toViewInputs: (
      h: HtmlBuilder<Dialog.Message>
    ) => Partial<Dialog.ViewInputs> = () => ({})
  ) =>
  (model: Dialog.Model, h: HtmlBuilder<Dialog.Message>) =>
    Dialog.view(
      model,
      {
        toView: (render) =>
          h.div(
            [h.Class("card")],
            [
              h.h2(render.title, ["Rename"]),
              h.div(render.actionBar, ["actions"]),
            ]
          ),
        ...toViewInputs(h),
      },
      h
    );

const describedView = (hasDescription: boolean) =>
  dialogView((h) => ({
    hasDescription,
    toView: (render) =>
      h.div(
        [h.Class("card")],
        [
          h.h2(render.title, ["Rename"]),
          h.p(render.description, ["Give the file a new name."]),
        ]
      ),
  }));

describe("Dialog view", () => {
  const mountDialog = Scene.Mount.resolveAll(...Dialog.sceneMounts);

  it("is named by its heading, on the veil, with the bar's keys bound", () => {
    Scene.scene(
      { update: Dialog.update, view: dialogView() },
      Scene.given(openDialog),
      Scene.Mount.expectHas(UiDialog.AcquireResources, Dialog.BindActionKeys),
      mountDialog,
      Scene.expect(Scene.role("dialog", { name: "Rename" })).toHaveClass(
        "veil"
      ),
      Scene.expect(Scene.selector(".veil-backdrop")).toExist(),
      Scene.expect(Scene.selector(".veil-pad .card")).toExist()
    );
  });

  it("stays open on the veil and a close control while its ways out are held", () => {
    Scene.scene(
      {
        update: heldUpdate,
        view: dialogView((h) => ({
          toView: (render) =>
            h.div(
              [h.Class("card")],
              [
                h.h2(render.title, ["Rename"]),
                h.div(render.actionBar, [
                  h.button(render.closeButton, ["cancel"]),
                ]),
              ]
            ),
        })),
      },
      Scene.given(openDialog),
      mountDialog,
      Scene.click(Scene.selector(".veil-backdrop")),
      Scene.click(Scene.role("button", { name: "cancel" })),
      Scene.expectNoOutMessage(),
      Scene.expect(Scene.role("dialog", { name: "Rename" })).toExist()
    );
  });

  it("takes a label and a placement for the <dialog>", () => {
    Scene.scene(
      {
        update: Dialog.update,
        view: dialogView((h) => ({
          toView: () => h.div([h.Class("card")], ["commands"]),
          label: "Commands",
          placement: "Top",
        })),
      },
      Scene.given(openDialog),
      Scene.Mount.resolve(
        UiDialog.AcquireResources,
        UiDialog.Message.SucceededAcquireResources()
      ),
      Scene.expect(Scene.role("dialog", { name: "Commands" })).toHaveClass(
        "veil"
      ),
      Scene.expect(Scene.selector(".veil-pad")).toHaveClass("top")
    );
  });

  it("hosts the page's live region inside the dialog, outside the card", () => {
    Scene.scene(
      {
        update: Dialog.update,
        view: dialogView((h) => ({
          toLiveRegionView: () => h.div([h.Role("status"), h.Class("live")]),
        })),
      },
      Scene.given(openDialog),
      mountDialog,
      Scene.expect(Scene.selector("dialog .live")).toExist(),
      Scene.expect(Scene.selector(".veil-pad .live")).toBeAbsent()
    );
  });

  it("is described by its description when it has one, and not otherwise", () => {
    Scene.scene(
      { update: Dialog.update, view: describedView(true) },
      Scene.given(openDialog),
      Scene.Mount.resolve(
        UiDialog.AcquireResources,
        UiDialog.Message.SucceededAcquireResources()
      ),
      Scene.expect(
        Scene.role("dialog", { name: "Rename" })
      ).toHaveAccessibleDescription("Give the file a new name.")
    );
    Scene.scene(
      { update: Dialog.update, view: describedView(false) },
      Scene.given(openDialog),
      Scene.Mount.resolve(
        UiDialog.AcquireResources,
        UiDialog.Message.SucceededAcquireResources()
      ),
      Scene.expect(Scene.role("dialog", { name: "Rename" })).not.toHaveAttr(
        "aria-describedby"
      )
    );
  });

  it("renders nothing inside while closed", () => {
    Scene.scene(
      { update: Dialog.update, view: dialogView() },
      Scene.given(Dialog.init({ id: "rename" })),
      Scene.expect(Scene.selector(".veil-backdrop")).toBeAbsent(),
      Scene.expect(Scene.selector(".card")).toBeAbsent()
    );
  });
});
