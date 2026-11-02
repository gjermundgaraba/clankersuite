import { Textarea as UiTextarea } from "@foldkit/ui";
import type {
  ChildAttribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from "foldkit/html";

import { controlAttributes, errorView, helpView } from "../field/field.ts";

/** Configuration for rendering a textarea field with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => Message;
  /** A sans sentence under the control. */
  help?: string;
  /** Why the value was refused: a red sentence under the control, which the control is
   *  described by, with red on its rule and its label (`aria-invalid`). Say it again in an
   *  ErrorSummary above the form. */
  error?: string | undefined;
  /** The form is not sent without it: screen readers hear "required" (`aria-required`). */
  isRequired?: boolean;
  /** Code and identifiers: the system monospace. */
  isMono?: boolean;
  /** The lines it opens at; it grows with its text from there. */
  rows?: number;
  /** Further attributes for the `<textarea>`, such as a placeholder or spelling off; never a
   *  class, and never its text, which is `value`. */
  textareaAttributes?: ReadonlyArray<
    TextareaAttribute<Message> | ChildAttribute
  >;
}>;

/** A labelled textarea with its help line, built on `@foldkit/ui`'s `Textarea`: the label
 *  names the textarea, the help line describes it (`aria-describedby`), an `error` sets
 *  `aria-invalid` and describes it before the help, and `isRequired` sets `aria-required`.
 *  Boxless like a Field, on a dotted baseline, with an ink corner grip. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    onInput,
    help,
    error,
    isRequired = false,
    isMono = false,
    rows,
    textareaAttributes = [],
  } = config;

  return UiTextarea.view(
    {
      id,
      value,
      onInput,
      isInvalid: error !== undefined,
      hasDescription: help !== undefined,
      ...(rows !== undefined && { rows }),
      toView: (groups) =>
        h.div(
          [h.Class(`field${isMono ? " mono" : ""}`)],
          [
            h.label(groups.label, [label]),
            h.textarea([
              ...textareaAttributes,
              ...groups.textarea,
              ...controlAttributes(id, error, help, isRequired, h),
            ]),
            ...errorView(id, error, h),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
