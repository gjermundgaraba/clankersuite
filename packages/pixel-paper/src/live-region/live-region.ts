import { Array, Option, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Announcer from "../announcer/announcer.ts";

/** A dialog that can host the page's live parts: its name in the application, and whether it
 *  is open now. */
export type DialogEntry<Host extends string> = readonly [
  host: Host,
  isOpen: boolean,
];

/** Where the page's live parts go on this render. */
export type Placement<Host extends string> = Readonly<{
  /** The `toLiveRegionView` to give the dialog `host`: the parts while it is the topmost open
   *  dialog, `undefined` while it is not. */
  toDialogView: (host: Host) => (() => Html) | undefined;
  /** The parts for the end of the body while no dialog is open, nothing while one is. */
  toPageView: () => readonly Html[];
}>;

/**
 * Places the page's live parts by the hosting rule: an open Dialog makes the page outside it
 * inert and hidden from screen readers, so they render inside the topmost open dialog, and at
 * the end of the body while none is open, exactly once either way. Neither renders them
 * until called, so a Submodel among the parts (the toast stack) is built once. `dialogs` lists every dialog
 * that can host them from the bottom of the stack to the top: one that opens from another
 * (a confirm from a form) comes after it, so of the open ones the last is the topmost. Call it
 * on every render, from the application's Model, so the parts move as dialogs open and close.
 *
 * ```ts
 * const placement = LiveRegion.place([
 *   ["Rename", Dialog.isOpen(model.rename)],
 *   ["Delete", ConfirmDialog.isOpen(model.deleteConfirm)],
 * ], () => LiveRegion.view({ toasts: toastsView(model, h) }, h));
 * // the rename dialog's view inputs: toLiveRegionView: placement.toDialogView("Rename")
 * // the body: [...content, ...placement.toPageView()]
 * ```
 */
export const place = <Host extends string>(
  dialogs: ReadonlyArray<DialogEntry<Host>>,
  toView: () => Html
): Placement<Host> => {
  const maybeTopmost = pipe(
    Array.findLast(dialogs, ([, isOpen]) => isOpen),
    Option.map(([host]) => host)
  );

  return {
    toDialogView: (host) =>
      Option.exists(maybeTopmost, (topmost) => topmost === host)
        ? toView
        : undefined,
    toPageView: () => (Option.isNone(maybeTopmost) ? [toView()] : []),
  };
};

/** Configuration for rendering the page's live parts with `view`. */
export type ViewConfig = Readonly<{
  /** The page's Toast stack (its `h.submodel`), when it has one. */
  toasts?: Html;
}>;

/** The page's live parts together, for `place`: the Announcer's region, then the toast stack
 *  the application gives. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [],
    [Announcer.view(h), ...(config.toasts === undefined ? [] : [config.toasts])]
  );
