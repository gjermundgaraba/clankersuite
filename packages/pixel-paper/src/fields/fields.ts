import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a form's fields with `view`. */
export type ViewConfig = Readonly<{
  body: ReadonlyArray<Html | string>;
  /** A save is in flight: every control in it is natively disabled at once (out of the
   *  keyboard, as rule 2's `isNativeDisabled`), and the group is `aria-busy`, so nothing changes
   *  under the save. Keep the submit Button outside, `isBusy`: it keeps focus. */
  isBusy?: boolean;
}>;

/** A form's fields, a column 14px apart (a body's gap), in one unnamed `<fieldset>` that
 *  `isBusy` disables. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, isBusy = false } = config;

  return h.fieldset(
    [
      ...(isBusy ? [h.Disabled(true), h.AriaBusy(true)] : []),
      h.Class("stack gap-m"),
    ],
    body
  );
};
