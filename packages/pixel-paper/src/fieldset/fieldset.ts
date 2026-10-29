import { Fieldset as UiFieldset } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { describedByError, errorView, helpView } from "../field/field.ts";

/** Configuration for rendering a fieldset with `view`. */
export type ViewConfig = Readonly<{
  /** Unique in the document: the legend's and the help line's ids are made from it. */
  id: string;
  /** The group's name, in the legend. */
  label: string;
  /** A sans sentence under the controls; it describes the group. */
  help?: string;
  /** Why the choice was refused: a red sentence under the controls, which the group is
   *  described by, before its help. Mark the control itself invalid too (RadioChoices'
   *  `isInvalid`), which turns the legend red. Say it again in an ErrorSummary above the
   *  form. */
  error?: string | undefined;
  /** The controls: Choices, a Segmented. */
  body: ReadonlyArray<Html | string>;
}>;

/** A group of controls under one name, built on `@foldkit/ui`'s Fieldset: a `<fieldset>`
 *  named by its `<legend>` and described by its error and its help line
 *  (`aria-describedby`). The legend turns red while a control in it is invalid. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, help, error, body } = config;

  return UiFieldset.view(
    {
      id,
      hasDescription: help !== undefined,
      toView: (groups) =>
        h.fieldset(
          [
            ...groups.fieldset,
            ...describedByError(id, error, help !== undefined, h),
            h.Class("field"),
          ],
          [
            h.legend([...groups.legend, h.Class("field-label")], [label]),
            ...body,
            ...errorView(id, error, h),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
