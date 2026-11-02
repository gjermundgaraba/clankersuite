import { Dialog as UiDialog } from "@foldkit/ui";
import { Array, Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { describe, expect, it } from "vite-plus/test";

import * as Dialog from "../dialog/dialog.ts";
import * as ConfirmDialog from "./confirm-dialog.ts";

const openConfirm = ConfirmDialog.open(
  ConfirmDialog.init({ id: "delete-file" })
).model;

const pressedEscape = ConfirmDialog.Message.GotDialogMessage({
  message: Dialog.Message.GotDialogMessage({
    message: UiDialog.Message.RequestedClose(),
  }),
});

describe("ConfirmDialog update", () => {
  it("reports Confirmed and stays open until the parent closes it", () => {
    Story.story(
      ConfirmDialog.update,
      Story.given(openConfirm),
      Story.message(ConfirmDialog.Message.ClickedConfirm()),
      Story.expectOutMessage(ConfirmDialog.OutMessage.Confirmed()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(ConfirmDialog.isOpen(model)).toBe(true);
      })
    );
  });

  it("closes and reports Cancelled for cancel", () => {
    Story.story(
      ConfirmDialog.update,
      Story.given(openConfirm),
      Story.message(ConfirmDialog.Message.ClickedCancel()),
      Story.expectOutMessage(ConfirmDialog.OutMessage.Cancelled()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("reports Cancelled once for Escape", () => {
    Story.story(
      ConfirmDialog.update,
      Story.given(openConfirm),
      Story.message(pressedEscape),
      Story.expectOutMessage(ConfirmDialog.OutMessage.Cancelled()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("stays open and reports nothing for Escape or cancel while its ways out are held", () => {
    Story.story(
      (model: ConfirmDialog.Model, message: ConfirmDialog.Message) =>
        ConfirmDialog.update(model, message, { isCloseHeld: true }),
      Story.given(openConfirm),
      Story.message(pressedEscape),
      Story.message(ConfirmDialog.Message.ClickedCancel()),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(ConfirmDialog.isOpen(model)).toBe(true);
      })
    );
  });

  it("closes without reporting Cancelled when the parent closes it", () => {
    const closed = ConfirmDialog.close(openConfirm);

    expect(ConfirmDialog.isOpen(closed.model)).toBe(false);
    expect(closed.commands?.map(({ name }) => name)).toStrictEqual([
      UiDialog.CloseDialog.name,
    ]);
  });
});

const ConfirmEvent = Schema.Literals(["Confirmed", "Cancelled"]);

const Model = Schema.Struct({
  confirm: ConfirmDialog.Model,
  events: Schema.Array(ConfirmEvent),
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  GotConfirmDialogMessage: { message: ConfirmDialog.Message },
});

type Message = typeof Message.Type;

const foldConfirmDialogOutMessage = ConfirmDialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Confirmed: () => (model) => ({
    model: modifyFields(model, {
      events: Array.append(ConfirmEvent.make("Confirmed")),
    }),
  }),
  Cancelled: () => (model) => ({
    model: modifyFields(model, {
      events: Array.append(ConfirmEvent.make("Cancelled")),
    }),
  }),
});

const foldConfirmDialog = (context: Dialog.UpdateContext) =>
  Update.foldChild({
    update: (confirm: ConfirmDialog.Model, message: ConfirmDialog.Message) =>
      ConfirmDialog.update(confirm, message, context),
    read: (model: Model) => Option.some(model.confirm),
    write: (model: Model, nextConfirm: ConfirmDialog.Model): Model =>
      modifyFields(model, { confirm: () => nextConfirm }),
    toParentMessage: (message) => Message.GotConfirmDialogMessage({ message }),
    foldOutMessage: foldConfirmDialogOutMessage,
  });

const updateWith =
  (context: Dialog.UpdateContext) => (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
      GotConfirmDialogMessage: ({ message: confirmMessage }) =>
        foldConfirmDialog(context)(model, confirmMessage),
    });

const update = updateWith({ isCloseHeld: false });

const view =
  (
    isDanger: boolean,
    held: Readonly<{ isBusy?: boolean; isDisabled?: boolean }> = {}
  ) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
      [],
      [
        h.submodel({
          slotId: "delete-file",
          model: model.confirm,
          view: ConfirmDialog.view,
          viewInputs: {
            title: "Delete",
            question: "Delete this file?",
            body: ["It goes from every device, and it cannot be undone."],
            toDetailView: () => [
              h.p([h.Class("why")], ["The server kept it."]),
            ],
            label: "delete",
            isDanger,
            ...held,
          },
          toParentMessage: (message) =>
            Message.GotConfirmDialogMessage({ message }),
        }),
        h.p([h.Class("events")], [Array.join(model.events, " ")]),
      ]
    );

const openModel: Model = { confirm: openConfirm, events: [] };

const acquireResources = Scene.Mount.resolveAll(...Dialog.sceneMounts);
const INITIAL_FOCUS_ATTRIBUTE = "data-foldkit-dialog-initial-focus";
const events = Scene.selector(".events");

describe("ConfirmDialog view", () => {
  it("prints a danger confirm as an alert with focus starting on cancel", () => {
    Scene.scene(
      { update, view: view(true) },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.role("alertdialog")).toExist(),
      Scene.expect(Scene.selector(".card-tb h2")).toHaveText("Delete"),
      Scene.expect(Scene.selector(".outcome-body strong")).toHaveText(
        "Delete this file?"
      ),
      Scene.expect(Scene.selector(".btn.danger")).toHaveText("delete"),
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveAttr(
        INITIAL_FOCUS_ATTRIBUTE
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveClass(
        "default-ring"
      ),
      Scene.expect(Scene.selector(".outcome .why")).toHaveText(
        "The server kept it."
      )
    );
  });

  it("is described by its Outcome's body: the question, the sentence and the detail", () => {
    Scene.scene(
      { update, view: view(true) },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.selector(".outcome-body")).toHaveAttr("id"),
      Scene.expect(
        Scene.role("alertdialog", { name: "Delete" })
      ).toHaveAccessibleDescription(
        "Delete this file?It goes from every device, and it cannot be undone.The server kept it."
      )
    );
  });

  it("starts on the action when the confirm is not destructive", () => {
    Scene.scene(
      { update, view: view(false) },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.selector(".btn.primary")).toHaveAttr(
        INITIAL_FOCUS_ATTRIBUTE
      ),
      Scene.expect(Scene.selector(".btn.danger")).toBeAbsent(),
      Scene.expect(Scene.role("alertdialog")).toBeAbsent(),
      Scene.expect(Scene.role("dialog")).toExist()
    );
  });

  it("holds a blocked action without the working cursor, in the keyboard, cancel live", () => {
    Scene.scene(
      { update, view: view(true, { isDisabled: true }) },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.role("button", { name: "delete" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "delete" })).not.toHaveAttr(
        "disabled"
      ),
      Scene.expect(Scene.role("button", { name: "delete" })).not.toHaveHandler(
        "click"
      ),
      Scene.expect(Scene.selector(".btn.danger .cursor")).toBeAbsent(),
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveHandler(
        "click"
      )
    );
  });

  it("reports Cancelled for a press on the veil", () => {
    Scene.scene(
      { update, view: view(true) },
      Scene.given(openModel),
      acquireResources,
      Scene.click(Scene.selector(".veil-backdrop")),
      Scene.expect(events).toHaveText("Cancelled"),
      Scene.expect(Scene.selector(".veil-backdrop")).toBeAbsent(),
      Scene.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Scene.Mount.expectEnded(UiDialog.AcquireResources, Dialog.BindActionKeys)
    );
  });

  it("holds cancel, in the keyboard, and stays open on the veil while busy and held", () => {
    Scene.scene(
      {
        update: updateWith({ isCloseHeld: true }),
        view: view(true, { isBusy: true }),
      },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).not.toHaveAttr(
        "disabled"
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).not.toHaveHandler(
        "click"
      ),
      Scene.expect(Scene.role("button", { name: "cancel" })).toHaveAttr(
        INITIAL_FOCUS_ATTRIBUTE
      ),
      Scene.expect(Scene.selector(".btn:not(.danger) .cursor")).toBeAbsent(),
      Scene.click(Scene.selector(".veil-backdrop")),
      Scene.expect(events).toHaveText(""),
      Scene.expect(Scene.selector(".veil-backdrop")).toExist()
    );
  });

  it("prints the working cursor while busy", () => {
    Scene.scene(
      { update, view: view(true, { isBusy: true }) },
      Scene.given(openModel),
      acquireResources,
      Scene.expect(Scene.role("button", { name: "delete" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.selector(".btn.danger .cursor")).toExist()
    );
  });

  it("hands the confirmation to the parent", () => {
    Scene.scene(
      { update, view: view(true) },
      Scene.given(openModel),
      acquireResources,
      Scene.click(Scene.selector(".btn.danger")),
      Scene.expect(events).toHaveText("Confirmed"),
      Scene.expect(Scene.role("alertdialog")).toExist()
    );
  });

  it("binds the action bar's keys on its action bar", () => {
    Scene.scene(
      { update, view: view(true) },
      Scene.given(openModel),
      Scene.Mount.expectHas(UiDialog.AcquireResources, Dialog.BindActionKeys),
      acquireResources,
      Scene.expect(Scene.selector(".card-actions")).toHaveAttr(
        "data-pixel-paper-action-bar"
      )
    );
  });
});
