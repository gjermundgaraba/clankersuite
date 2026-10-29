import { Dialog as UiDialog } from "@foldkit/ui";
import { Array, Match, Option, Schema, pipe } from "effect";
import { constUndefined } from "effect/Function";
import * as Dom from "foldkit/dom";
import { childAttributes } from "foldkit/html";
import type { ChildAttribute, Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { isPlain } from "../keys/keys.ts";
import { foldDialog } from "./fold.ts";

/** Schema for a pixel-paper dialog: the `@foldkit/ui` Dialog it is built on. */
export const Model = Schema.Struct({
  dialog: UiDialog.Model,
});

export type Model = typeof Model.Type;

const ActionDirection = Schema.Literals(["Previous", "Next"]);

type ActionDirection = typeof ActionDirection.Type;

/** Where the card hangs: `Center`, or `Top`, 18% down, for a command palette. */
export const Placement = Schema.Literals(["Center", "Top"]);

export type Placement = typeof Placement.Type;

/** Union of all Messages a dialog can produce. `PressedActionKey` is a key in the action bar
 *  that moved focus there (the Mount already moved it); nothing in the Model follows it. */
export const Message = defineMessageUnion({
  GotDialogMessage: { message: UiDialog.Message },
  PressedActionKey: { direction: ActionDirection },
});

export type Message = typeof Message.Type;

/** Union of OutMessages a dialog reports to its parent: the reader closed it (Escape, a click
 *  on the veil, a close button). `open` and `close`, which the parent calls, report nothing. */
export const OutMessage = defineMessageUnion({
  Closed: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a dialog with `init`. The `id` must be unique in the document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a closed dialog. */
export const init = (config: InitConfig): Model => ({
  dialog: UiDialog.init({ id: config.id }),
});

/** The dialog's id, unique in the document. */
export const id = (model: Model): string => model.dialog.id;

/** Whether the dialog is open. */
export const isOpen = (model: Model): boolean => model.dialog.isOpen;

const toOutMessage = UiDialog.OutMessage.match<OutMessage | undefined>({
  Opened: constUndefined,
  Closed: () => OutMessage.Closed(),
});

const dialogFold = foldDialog(UiDialog, {
  read: (model: Model) => model.dialog,
  write: (model: Model, nextDialog: UiDialog.Model) =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: (message: UiDialog.Message) =>
    Message.GotDialogMessage({ message }),
  toParentOutMessage: toOutMessage,
});

/** What a dialog's update reads from its parent as a Message arrives. */
export type UpdateContext = Readonly<{
  /** The reader may not walk away from the work running now (a save whose failure must land
   *  in this dialog): Escape, a press on the veil and a control given the `closeButton` group
   *  change nothing and report no `Closed`. Read it from the parent's own state as the
   *  Message arrives (`isSaving(model)`), so it holds exactly while the work runs, however
   *  soon after the start a key comes. */
  isCloseHeld: boolean;
}>;

export const FREE: UpdateContext = { isCloseHeld: false };

const isHeldClose = (
  context: UpdateContext,
  message: UiDialog.Message
): boolean => context.isCloseHeld && message._tag === "RequestedClose";

/** Processes a dialog Message and returns the next Model, Commands and OutMessage. */
export const update = (
  model: Model,
  message: Message,
  context: UpdateContext = FREE
) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotDialogMessage: ({ message: dialogMessage }) =>
        isHeldClose(context, dialogMessage)
          ? { model }
          : dialogFold.update(model, dialogMessage),
      PressedActionKey: () => ({ model }),
    }
  );

/** Opens the dialog: focus moves to the element given the `initialFocus` group, else to the
 *  first control, and returns to where it was when the dialog closes. */
export const open = (model: Model): Update.Return<Model, Message> =>
  dialogFold.open(model);

/** Closes the dialog without reporting `Closed`. */
export const close = (model: Model): Update.Return<Model, Message> =>
  dialogFold.close(model);

const ACTION_BAR_ATTRIBUTE = "data-pixel-paper-action-bar";
const ACTION_SELECTOR = "button:not(:disabled), a[href]";

const isInBarItself = (bar: Element, action: HTMLElement): boolean =>
  action.closest(`[${ACTION_BAR_ATTRIBUTE}]`) === bar;

const isInBarsDialog = (bar: Element, action: HTMLElement): boolean =>
  action.closest("dialog") === bar.closest("dialog");

const isOutsidePopover = (action: HTMLElement): boolean =>
  action.closest("[popover]") === null;

const ownedActions = (bar: Element): readonly HTMLElement[] =>
  Array.filter(
    Array.fromIterable(bar.querySelectorAll<HTMLElement>(ACTION_SELECTOR)),
    (action) =>
      isInBarItself(bar, action) &&
      isInBarsDialog(bar, action) &&
      isOutsidePopover(action)
  );

const isUnhandledPlainKey = (event: KeyboardEvent): boolean =>
  !event.isComposing && !event.defaultPrevented && isPlain(event);

const actionBeside = (
  actions: readonly HTMLElement[],
  target: EventTarget | null,
  direction: ActionDirection
): Option.Option<HTMLElement> =>
  Option.flatMap(
    Array.findFirstIndex(actions, (action) => action === target),
    (index) => Array.get(actions, index + (direction === "Previous" ? -1 : 1))
  );

const toActionDirection = (key: string): Option.Option<ActionDirection> =>
  Match.value(key).pipe(
    Match.withReturnType<Option.Option<ActionDirection>>(),
    Match.whenOr("h", "ArrowLeft", () => Option.some("Previous")),
    Match.whenOr("l", "ArrowRight", () => Option.some("Next")),
    Match.orElse(() => Option.none())
  );

export const moveActionFocus = (
  bar: Element,
  event: KeyboardEvent
): Option.Option<ActionDirection> => {
  if (!isUnhandledPlainKey(event)) {
    return Option.none();
  }

  return pipe(
    toActionDirection(event.key),
    Option.flatMap((direction) =>
      Option.map(
        actionBeside(ownedActions(bar), event.target, direction),
        (next) => {
          event.preventDefault();
          next.focus();

          return direction;
        }
      )
    )
  );
};

/** The action bar's keys: h or ←, and l or →, move focus between its actions (see
 *  `moveActionFocus`). Attached by the `actionBar` group. In a Scene, resolve it with
 *  `sceneMounts`. */
export const BindActionKeys = Mount.defineStream("BindActionKeys", {
  messages: [Message.PressedActionKey],
  execute: ({ element }) =>
    Dom.streamFromEventFilterMap({
      target: element,
      type: "keydown",
      filterMapEvent: (event) =>
        Option.map(moveActionFocus(element, event), (direction) =>
          Message.PressedActionKey({ direction })
        ),
    }),
});

/** What a parent's Scene resolves an open dialog's Mounts with (`@foldkit/ui`'s resources,
 *  then the action bar's keys), each with a Message that changes nothing:
 *  `Scene.Mount.resolveAll(...Dialog.sceneMounts)`. It serves every dialog built on this one
 *  (ConfirmDialog, KeyHelp, CommandPalette), since a Scene lifts the Messages for it. */
export const sceneMounts = [
  // oxlint-disable-next-line foldkit/no-child-message-construction-in-root
  [UiDialog.AcquireResources, UiDialog.Message.SucceededAcquireResources()],
  [BindActionKeys, Message.PressedActionKey({ direction: "Next" })],
] as const;

/** Attribute groups a dialog hands its content. Spread each onto the element it names; a Card
 *  takes `title` and `actionBar` directly. None of them carries a class. */
export type RenderInfo = Readonly<{
  /** The heading that names the dialog. Leave it unspread when the dialog has a `label`. */
  title: readonly ChildAttribute[];
  /** The text that says what the dialog asks; set `hasDescription` when it is rendered. */
  description: readonly ChildAttribute[];
  /** The control that takes focus when the dialog opens. */
  initialFocus: readonly ChildAttribute[];
  /** A control that closes the dialog: a close glyph, a cancel button. */
  closeButton: readonly ChildAttribute[];
  /** The card's action bar: h or ←, and l or →, move focus between its actions. */
  actionBar: readonly ChildAttribute[];
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** The dialog's content, one Card. A function because it receives the attribute groups. */
  toView: (render: RenderInfo) => Html;
  /** The dialog's name when no heading in it says it (a command palette): printed for
   *  screen readers only. Otherwise the content's heading names it, through `title`. */
  label?: string;
  /** An alert dialog: a question that interrupts, such as a confirm. */
  isAlert?: boolean;
  placement?: Placement;
  hasDescription?: boolean;
  /** The page's live region (`Announcer.view`) and toast stack, while this is the topmost
   *  open dialog: the page outside it is inert and hidden from screen readers. Rendered
   *  inside the dialog, outside the card. A function, so markup with the application's
   *  handlers (the toasts' buttons) is built in the application's boundary. `undefined` while
   *  another dialog is the topmost: the application decides the host on every render. */
  toLiveRegionView?: (() => Html) | undefined;
}>;

/**
 * A modal dialog on the ink veil with its checker grain, built on `@foldkit/ui`'s Dialog. It
 * opens with `show()` in place, not in the top layer: Foldkit makes the page behind it inert
 * and hidden from screen readers, traps focus, closes it on Escape and on a click on the veil
 * (`.veil-backdrop`, under `.veil-pad`, which lets a click through everywhere but on the
 * card), and returns focus on close. The content comes from `toView`, usually one Card given
 * the `title` and `actionBar` groups.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      toView,
      label,
      isAlert = false,
      placement = "Center",
      hasDescription = false,
      toLiveRegionView,
    } = viewInputs;

    const actionBar = childAttributes([
      h.Attribute(ACTION_BAR_ATTRIBUTE, ""),
      h.OnMount(BindActionKeys()),
    ]);

    const veilView = (render: UiDialog.RenderInfo): Html =>
      h.dialog(
        [
          ...render.dialog,
          ...(isAlert ? [h.Role("alertdialog")] : []),
          h.Class("veil"),
        ],
        render.isVisible
          ? [
              h.div([...render.backdrop, h.Class("veil-backdrop")]),
              ...(label === undefined
                ? []
                : [h.span([...render.title, h.Class("sr-only")], [label])]),
              h.div(
                [
                  ...render.panel,
                  h.Class(placement === "Top" ? "veil-pad top" : "veil-pad"),
                ],
                [
                  toView({
                    title: render.title,
                    description: render.description,
                    initialFocus: render.initialFocus,
                    closeButton: render.closeButton,
                    actionBar,
                  }),
                ]
              ),
              ...(toLiveRegionView === undefined ? [] : [toLiveRegionView()]),
            ]
          : []
      );

    return h.submodel({
      slotId: id(model),
      model: model.dialog,
      view: UiDialog.view,
      viewInputs: { hasDescription, toView: veilView },
      toParentMessage: (message) => Message.GotDialogMessage({ message }),
    });
  }
);
