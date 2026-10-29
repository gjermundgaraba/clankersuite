import { Select as UiSelect } from "@foldkit/ui";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { controlAttributes, errorView, helpView } from "../field/field.ts";

/** One choice in a `SelectField`. */
export type SelectOption = Readonly<{
  value: string;
  label: string;
  /** Listed but not choosable, such as a place that is gone. */
  isDisabled?: boolean;
}>;

/** Choices listed under a heading (`optgroup`). */
export type SelectGroup = Readonly<{
  /** Tells groups apart when two share a label. */
  key: string;
  label: string;
  options: readonly SelectOption[];
}>;

/** Configuration for rendering a select field with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string;
  label: string;
  /** The chosen option's value. */
  value: string;
  onChange: (value: string) => Message;
  /** The choices, in order; a group lists its own under its heading. */
  options: ReadonlyArray<SelectOption | SelectGroup>;
  /** A sans sentence under the control. */
  help?: string;
  /** Why the value was refused: a red sentence under the control, which the control is
   *  described by, with red on its box and its label (`aria-invalid`). Say it again in an
   *  ErrorSummary above the form. */
  error?: string | undefined;
  /** The form is not sent without it: screen readers hear "required" (`aria-required`). */
  isRequired?: boolean;
}>;

const isGroup = (entry: SelectOption | SelectGroup): entry is SelectGroup =>
  "options" in entry;

const optionView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ value, label, isDisabled = false }: SelectOption): Html =>
    h.keyed("option")(value, [h.Value(value), h.Disabled(isDisabled)], [label]);

const entryView =
  <Message>(h: HtmlBuilder<Message>) =>
  (entry: SelectOption | SelectGroup): Html =>
    isGroup(entry)
      ? h.keyed("optgroup")(
          entry.key,
          [h.Attribute("label", entry.label)],
          Array.map(entry.options, optionView(h))
        )
      : optionView(h)(entry);

/** A labelled select with its help line, built on `@foldkit/ui`'s `Select`: the label names
 *  the select, the help line describes it (`aria-describedby`), an `error` sets
 *  `aria-invalid` and describes it before the help, and `isRequired` sets `aria-required`.
 *  The stylesheet draws the box, the caret and the picker. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    onChange,
    options,
    help,
    error,
    isRequired = false,
  } = config;

  return UiSelect.view(
    {
      id,
      value,
      onChange,
      isInvalid: error !== undefined,
      hasDescription: help !== undefined,
      toView: (groups) =>
        h.div(
          [h.Class("field")],
          [
            h.label(groups.label, [label]),
            h.select(
              [
                ...groups.select,
                ...controlAttributes(id, error, help, isRequired, h),
              ],
              Array.map(options, entryView(h))
            ),
            ...errorView(id, error, h),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
