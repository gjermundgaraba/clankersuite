import { Input as UiInput } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";
import { controlAttributes, errorView, helpView } from "../field/field.ts";
import * as IconButton from "../icon-button/icon-button.ts";

/** Configuration for rendering a password field with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the input's id. */
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => Message;
  /** Whether the password prints in the clear. The caller keeps it, as it keeps `value`, and
   *  hides it again when the form is sent. */
  isShown: boolean;
  /** The show toggle's Message: flip `isShown`. */
  onToggleShown: Message;
  /** A sans sentence under the box. */
  help?: string;
  /** Why the value was refused: a red sentence under the control, which the control is
   *  described by, with red on its box and its label (`aria-invalid`). Say it again in an
   *  ErrorSummary above the form. */
  error?: string | undefined;
  /** The form is not sent without it: screen readers hear "required" (`aria-required`). */
  isRequired?: boolean;
  /** `current-password` to sign in, `new-password` to set one. */
  autocomplete?: "current-password" | "new-password";
  /** The show toggle's name, "Show password" when not given: give each of two fields in a
   *  form its own, such as "Show password again". */
  toggleLabel?: string;
}>;

/** A boxed password field with a show toggle inside its box, built on `@foldkit/ui`'s Input:
 *  named by its label, described by its help line, `aria-invalid` and described by its
 *  `error` when it failed, and `aria-required` when the form is not sent without it. The
 *  toggle is a button named `toggleLabel` ("Show password"), `aria-pressed` while the
 *  password shows. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    onInput,
    isShown,
    onToggleShown,
    help,
    error,
    isRequired = false,
    autocomplete = "current-password",
    toggleLabel = "Show password",
  } = config;

  return UiInput.view(
    {
      id,
      value,
      onInput,
      isInvalid: error !== undefined,
      type: isShown ? "text" : "password",
      hasDescription: help !== undefined,
      toView: (groups) =>
        h.div(
          [h.Class("field boxed")],
          [
            h.label(groups.label, [label]),
            h.span(
              [h.Class("password")],
              [
                h.input([
                  ...groups.input,
                  h.Autocomplete(autocomplete),
                  ...controlAttributes(id, error, help, isRequired, h),
                ]),
                IconButton.view(
                  {
                    glyph: isShown ? "eye-off" : "eye",
                    label: toggleLabel,
                    isQuiet: true,
                    onClick: onToggleShown,
                    attributes: [pressedAttribute(isShown, h)],
                  },
                  h
                ),
              ]
            ),
            ...errorView(id, error, h),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
