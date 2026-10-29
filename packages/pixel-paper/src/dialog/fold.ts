import { Option } from "effect";
import * as Update from "foldkit/update";

import type { UpdateContext } from "./dialog.ts";

type ChildReturn<ChildModel, ChildMessage, ChildOutMessage> =
  Update.ReturnWithOutMessage<ChildModel, ChildMessage, ChildOutMessage>;

/** A dialog a parent holds: its update, and the steps that open and close it (`@foldkit/ui`'s
 *  Dialog, or pixel-paper's). */
export type DialogChild<ChildModel, ChildMessage, ChildOutMessage> = Readonly<{
  update: (
    model: ChildModel,
    message: ChildMessage,
    context: UpdateContext
  ) => ChildReturn<ChildModel, ChildMessage, ChildOutMessage>;
  open: (
    model: ChildModel
  ) => ChildReturn<ChildModel, ChildMessage, ChildOutMessage>;
  close: (
    model: ChildModel
  ) => ChildReturn<ChildModel, ChildMessage, ChildOutMessage>;
}>;

/** Where the parent keeps its dialog, and what the dialog's Messages and OutMessages become. */
export type DialogFoldConfig<
  ParentModel,
  ParentMessage,
  ParentOutMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
> = Readonly<{
  read: (model: ParentModel) => ChildModel;
  write: (model: ParentModel, nextDialog: ChildModel) => ParentModel;
  toParentMessage: (message: ChildMessage) => ParentMessage;
  /** The parent's OutMessage for one the dialog reports from its own update (Escape, the
   *  veil, a close button). Without it the dialog's OutMessages report nothing: a parent
   *  that reads `isOpen` when it needs to. */
  toParentOutMessage?: (
    outMessage: ChildOutMessage
  ) => ParentOutMessage | undefined;
  /** Whether the dialog's ways out are held, read from the parent's own state as each
   *  Message arrives (`(model) => model.isSaving`). Free when not given. See
   *  `Dialog.UpdateContext`. */
  isCloseHeld?: (model: ParentModel) => boolean;
}>;

/** The dialog folded into its parent: a dialog Message, and opening and closing it. */
export type DialogFold<
  ParentModel,
  ParentMessage,
  ParentOutMessage,
  ChildMessage,
> = Readonly<{
  update: (
    model: ParentModel,
    message: ChildMessage
  ) => Update.ReturnWithOutMessage<
    ParentModel,
    ParentMessage,
    ParentOutMessage
  >;
  /** The update a parent that is itself a dialog (ConfirmDialog) runs with the hold its own
   *  parent gave it. */
  updateWith: (
    context: UpdateContext
  ) => (
    model: ParentModel,
    message: ChildMessage
  ) => Update.ReturnWithOutMessage<
    ParentModel,
    ParentMessage,
    ParentOutMessage
  >;
  open: (model: ParentModel) => Update.Return<ParentModel, ParentMessage>;
  close: (model: ParentModel) => Update.Return<ParentModel, ParentMessage>;
}>;

/** Folds a dialog a parent always holds (`Dialog`, `ConfirmDialog`, `@foldkit/ui`'s Dialog):
 *  its update, `open` and `close`, each lifted into the parent's Model and Messages, in place
 *  of a `foldChild` and two `foldChildStep`s.
 *
 *  ```ts
 *  const dialogFold = Dialog.foldDialog(Dialog, {
 *    read: (model: Model) => model.dialog,
 *    write: (model: Model, dialog: Dialog.Model) => modifyFields(model, { dialog: () => dialog }),
 *    toParentMessage: (message: Dialog.Message): Message => Message.GotDialogMessage({ message }),
 *  });
 *  ```
 *
 *  `toParentMessage` returns the parent's whole Message, so the steps compose with the
 *  parent's own in `Update.combine`.
 *
 *  A step the parent asked for reports nothing: `open` and `close` return the next Model and
 *  Commands, and the parent, which called them, attaches its own OutMessage where it has one
 *  (`pipe(dialogFold.close(model), Update.withOutMessage(…))`). Only the dialog's own Escape,
 *  veil or close button reports, through `update`, and only when `toParentOutMessage` is
 *  given; without it `update` reports nothing either.
 *
 *  A parent that acts on what the dialog reports by changing its own Model (a ConfirmDialog's
 *  `Confirmed`) folds that update with `Update.foldChild` and its `foldOutMessage`. */
export const foldDialog = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage = never,
>(
  child: DialogChild<ChildModel, ChildMessage, ChildOutMessage>,
  config: DialogFoldConfig<
    ParentModel,
    ParentMessage,
    ParentOutMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage
  >
): DialogFold<ParentModel, ParentMessage, ParentOutMessage, ChildMessage> => {
  const lift = {
    read: (model: ParentModel) => Option.some(config.read(model)),
    write: config.write,
    toParentMessage: config.toParentMessage,
  };

  const foldOutMessage = () => (model: ParentModel) => ({ model });
  const { toParentOutMessage, isCloseHeld = () => false } = config;

  const updateWith = (context: UpdateContext) => {
    const childUpdate = (model: ChildModel, message: ChildMessage) =>
      child.update(model, message, context);

    return toParentOutMessage === undefined
      ? Update.foldChild({ update: childUpdate, ...lift, foldOutMessage })
      : Update.foldChild({ update: childUpdate, ...lift, toParentOutMessage });
  };

  return {
    update: (model, message) =>
      updateWith({ isCloseHeld: isCloseHeld(model) })(model, message),
    updateWith,
    open: Update.foldChildStep({ update: child.open, ...lift, foldOutMessage }),
    close: Update.foldChildStep({
      update: child.close,
      ...lift,
      foldOutMessage,
    }),
  };
};
