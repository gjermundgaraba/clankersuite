import { Input as UiInput } from "@foldkit/ui";
import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";
import { controlAttributes, errorView, helpView } from "../field/field.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import * as Meter from "../meter/meter.ts";

/** How strong a new password is, 0 to 4, as the product measures it. */
export const Strength = Schema.Literals([0, 1, 2, 3, 4]);

export type Strength = typeof Strength.Type;

const STRENGTH_CELLS = 4;

const strengthWord = (strength: Strength): string =>
  Match.value(strength).pipe(
    Match.withReturnType<string>(),
    Match.when(0, () => "too short"),
    Match.when(1, () => "weak"),
    Match.when(2, () => "fair"),
    Match.when(3, () => "good"),
    Match.when(4, () => "strong"),
    Match.exhaustive
  );

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
  /** For a new password: four short cells and a word under the box (an empty box is "too
   *  short"). Leave it out when signing in. */
  strength?: Strength;
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
 *  password shows. For a new password, its strength is a meter. */
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
    strength,
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
            ...(strength === undefined
              ? []
              : [
                  h.span(
                    [h.Class("strength")],
                    [
                      Meter.cellsView(
                        {
                          id: `${id}-strength`,
                          count: STRENGTH_CELLS,
                          on: strength,
                          isShort: true,
                          label: "Password strength",
                          valueText: strengthWord(strength),
                        },
                        h
                      ),
                      h.span([h.Class("age")], [strengthWord(strength)]),
                    ]
                  ),
                ]),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
