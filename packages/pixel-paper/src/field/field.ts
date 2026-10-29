import { Input as UiInput } from "@foldkit/ui";
import type {
  Attribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

const errorId = (id: string): string => `${id}-error`;

export const errorView = <Message>(
  id: string,
  error: string | undefined,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  error === undefined
    ? []
    : [h.p([h.Id(errorId(id)), h.Class("field-error")], [error])];

/** Points the control at its error, then at its help line when it has one. After the
 *  `@foldkit/ui` attributes, whose `aria-describedby` names the help line alone; every
 *  `@foldkit/ui` control names that line `<id>-description`, as Input does. */
export const describedByError = <Message>(
  id: string,
  error: string | undefined,
  hasHelp: boolean,
  h: HtmlBuilder<Message>
): ReadonlyArray<TextareaAttribute<Message>> =>
  error === undefined
    ? []
    : [
        h.AriaDescribedBy(
          hasHelp ? `${errorId(id)} ${UiInput.descriptionId(id)}` : errorId(id)
        ),
      ];

export const controlAttributes = <Message>(
  id: string,
  error: string | undefined,
  help: string | undefined,
  isRequired: boolean,
  h: HtmlBuilder<Message>
): ReadonlyArray<TextareaAttribute<Message>> => [
  ...describedByError(id, error, help !== undefined, h),
  ...(isRequired ? [h.AriaRequired(true)] : []),
];

export const helpView = <Message>(
  help: string | undefined,
  description: ReadonlyArray<Attribute<Message>>,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  help === undefined
    ? []
    : [h.p([...description, h.Class("field-help")], [help])];

/** Configuration for rendering a text field with `view`. */
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
  /** A 2px ink box: the field that is the whole job of its form. A date is always boxed. */
  isBoxed?: boolean;
  /** Code and identifiers: the system monospace. */
  isMono?: boolean;
  /** The label is for screen readers only (`.sr-only`): a field whose place says what it is,
   *  such as a browser's address bar. It still names the input. */
  isLabelHidden?: boolean;
  /** The input's type (`"date"` for the browser's date control, always boxed); text when not
   *  given. */
  type?: string;
  /** Further attributes for the `<input>`, such as a Dialog's `initialFocus` group; never a
   *  class. */
  inputAttributes?: Attributes<Message>;
}>;

/** A labelled text input with its help line, built on `@foldkit/ui`'s `Input`: the label
 *  names the input, the help line describes it (`aria-describedby`), an `error` sets
 *  `aria-invalid` and describes it before the help, and `isRequired` sets `aria-required`.
 *  The input is boxless, a dotted baseline that turns solid ink on focus. */
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
    isBoxed = false,
    isMono = false,
    isLabelHidden = false,
    type,
    inputAttributes = [],
  } = config;

  return UiInput.view(
    {
      id,
      value,
      onInput,
      isInvalid: error !== undefined,
      ...(type !== undefined && { type }),
      hasDescription: help !== undefined,
      toView: (groups) =>
        h.div(
          [
            h.Class(
              `field${isBoxed || type === "date" ? " boxed" : ""}${isMono ? " mono" : ""}`
            ),
          ],
          [
            h.label(
              [...groups.label, ...(isLabelHidden ? [h.Class("sr-only")] : [])],
              [label]
            ),
            h.input([
              ...inputAttributes,
              ...groups.input,
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
