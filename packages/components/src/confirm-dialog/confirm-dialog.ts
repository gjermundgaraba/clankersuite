import { Schema, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import * as Button from "../button/button.ts";
import * as Card from "../card/card.ts";
import * as Dialog from "../dialog/dialog.ts";
import { foldDialog } from "../dialog/fold.ts";
import * as Outcome from "../outcome/outcome.ts";

/** Schema for a confirm dialog: the pixel-paper Dialog it opens in. */
export const Model = Schema.Struct({
  dialog: Dialog.Model,
});

export type Model = typeof Model.Type;

/** Union of all Messages a confirm dialog can produce. */
export const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  ClickedConfirm: {},
  ClickedCancel: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages a confirm dialog reports. `Confirmed`: the reader pressed the action;
 *  the dialog stays open until the parent calls `close`. `Cancelled`: cancel, Escape or a click
 *  on the veil; the dialog has closed, and whether that also stops work already running is
 *  the parent's to decide. Never reported while its ways out are held (`Dialog.UpdateContext`). */
export const OutMessage = defineMessageUnion({
  Confirmed: {},
  Cancelled: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a confirm dialog with `init`. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a closed confirm dialog. */
export const init = (config: InitConfig): Model => ({
  dialog: Dialog.init({ id: config.id }),
});

const toCancelled = Dialog.OutMessage.match<OutMessage>({
  Closed: () => OutMessage.Cancelled(),
});

const dialogFold = foldDialog(Dialog, {
  read: (model: Model) => model.dialog,
  write: (model: Model, nextDialog: Dialog.Model): Model =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: (message: Dialog.Message) =>
    Message.GotDialogMessage({ message }),
  toParentOutMessage: toCancelled,
});

/** Processes a confirm dialog Message and returns the next Model, Commands and OutMessage.
 *  While `context.isCloseHeld`, cancel, Escape and the veil change nothing. */
export const update = (
  model: Model,
  message: Message,
  context: Dialog.UpdateContext = Dialog.FREE
) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotDialogMessage: ({ message: dialogMessage }) =>
        dialogFold.updateWith(context)(model, dialogMessage),
      ClickedConfirm: () => ({ model, outMessage: OutMessage.Confirmed() }),
      ClickedCancel: () =>
        context.isCloseHeld
          ? { model }
          : pipe(
              dialogFold.close(model),
              Update.withOutMessage(OutMessage.Cancelled())
            ),
    }
  );

/** Opens the confirm dialog: focus starts on the action, or on cancel when it is `isDanger`. */
export const open = (model: Model): Update.Return<Model, Message> =>
  dialogFold.open(model);

/** Closes the confirm dialog without reporting `Cancelled`: call it once confirmed work has
 *  landed. */
export const close = (model: Model): Update.Return<Model, Message> =>
  dialogFold.close(model);

/** The confirm dialog's id, unique in the document. */
export const id = (model: Model): string => Dialog.id(model.dialog);

/** Whether the confirm dialog is open. */
export const isOpen = (model: Model): boolean => Dialog.isOpen(model.dialog);

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** The title bar: the action's name (`"Delete"`). */
  title: string;
  /** Pixel caps under the glyph: the question (`"Delete this file?"`), the Outcome's title. */
  question: string;
  /** One sans sentence: what happens, and what cannot be undone. Markup that carries no
   *  handlers: it is built in the application's boundary and rendered in this Submodel's (put
   *  controls in `toDetailView`). */
  body: ReadonlyArray<Html | string>;
  /** Under the sentence: what the work said back (an error Notice, what to do about it, a
   *  notice with its own retry). A slot that may carry the application's handlers, so a
   *  function. */
  toDetailView?: () => ReadonlyArray<Html | string>;
  /** The confirming button's word (`"delete"`). */
  label: string;
  /** Destructive: the confirming button turns red and cancel becomes the default. */
  isDanger?: boolean;
  /** The confirmed work is running: the confirming button is held (its word stays, the
   *  working cursor prints, a second press does nothing) and keeps focus, and cancel is held
   *  with it. Pair it with `isCloseHeld` in `update`'s context, from the same state, so
   *  Escape and the veil change nothing either. */
  isBusy?: boolean;
  /** The action cannot run now (nothing is running; it is blocked): the confirming button is
   *  held, `aria-disabled` without the working cursor, and stays in the keyboard, so focus
   *  does not fall to the page. Cancel stays live. */
  isDisabled?: boolean;
  /** The page's live region and toasts while this is the topmost open dialog, `undefined`
   *  while it is not (see `Dialog`). */
  toLiveRegionView?: (() => Html) | undefined;
}>;

const cardView = (
  viewInputs: ViewInputs,
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html => {
  const {
    isDanger = false,
    isBusy = false,
    isDisabled = false,
    toDetailView,
  } = viewInputs;

  const commit = Button.view(
    {
      label: viewInputs.label,
      variant: isDanger ? "Danger" : "Primary",
      isDefault: !isDanger,
      isBusy,
      isDisabled,
      onClick: Message.ClickedConfirm(),
      attributes: isDanger ? [] : render.initialFocus,
    },
    h
  );

  const cancel = Button.view(
    {
      label: "cancel",
      isDefault: isDanger,
      isDisabled: isBusy,
      onClick: Message.ClickedCancel(),
      attributes: isDanger ? render.initialFocus : [],
    },
    h
  );

  return Card.view(
    {
      title: viewInputs.title,
      titleAttributes: render.title,
      isNarrow: true,
      actionBarAttributes: render.actionBar,
      actions: isDanger ? [commit, cancel] : [cancel, commit],
      body: [
        Outcome.view(
          {
            title: viewInputs.question,
            body: viewInputs.body,
            tone: isDanger ? "Error" : "Warn",
            ...(toDetailView !== undefined && { detail: toDetailView() }),
            bodyAttributes: render.description,
          },
          h
        ),
      ],
    },
    h
  );
};

/**
 * The one question before an irreversible step: a glyph in a box, a headline, a sentence. With
 * `isDanger` it is the system's only destructive confirm. The thing that destroys (delete,
 * disable, reset) is a neutral Button at rest that opens this dialog; the red button is the
 * commit inside it, focus starts on cancel, and the dialog is an alert (`alertdialog`); without
 * it the dialog is a plain one with focus on the action. There is no inline
 * arm-then-confirm button: red never rests on a button, and an armed button is easy to
 * double-click through.
 *
 * Work that takes a while stays in the dialog: set `isBusy` while it runs (and `isCloseHeld`
 * in `update`'s context), `close` once it has landed, and on failure keep it open with the
 * error in `toDetailView`.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.submodel({
      slotId: id(model),
      model: model.dialog,
      view: Dialog.view,
      viewInputs: {
        isAlert: viewInputs.isDanger ?? false,
        hasDescription: true,
        toLiveRegionView: viewInputs.toLiveRegionView,
        toView: (render) => cardView(viewInputs, render, h),
      },
      toParentMessage: (message) => Message.GotDialogMessage({ message }),
    })
);
