import { Checkbox as UiCheckbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";
import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a select-all head with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Unique in the document: the ids of the box's name and of its count are made from it.
   *  The box itself has no id. */
  id: string;
  /** How many rows the list holds. */
  total: number;
  /** How many of them are selected, from the caller's Model. */
  selected: number;
  /** Select all (`true`) or none (`false`). A mixed box selects all. */
  onToggle: (isAll: boolean) => Message;
  /** Small buttons for the selection. They always show, so the head never shifts and focus
   *  never drops when the selection clears: give them `isDisabled` while nothing is selected. */
  actions?: ReadonlyArray<Html | string>;
}>;

/**
 * The head of a selectable list, above its rows in a flush panel, built on `@foldkit/ui`'s
 * Checkbox: a box that is checked, clear or mixed (`aria-checked="mixed"`), the count
 * (`"3 of 12 selected"`), which describes the box, and the bulk actions. The box is named
 * "Select all", and only the box toggles: a click on the count does nothing. With no rows it
 * is unavailable (`aria-disabled`), as there is nothing to select, and keeps its place in the
 * keyboard.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { id, total, selected, onToggle, actions = [] } = config;

  return UiCheckbox.view(
    {
      id,
      isChecked: total > 0 && selected === total,
      isIndeterminate: selected > 0 && selected < total,
      isDisabled: total === 0,
      hasDescription: true,
      onToggle,
      toView: (groups) =>
        h.div(
          [h.Class("row bulk")],
          [
            h.span(
              [h.Class("row-check")],
              [
                h.button(groups.checkbox),
                h.span([...groups.label, h.Class("sr-only")], ["Select all"]),
              ]
            ),
            h.div(
              [h.Class("grow")],
              [
                h.span(
                  [...groups.description, h.Class("bulk-count")],
                  [
                    `${selected.toLocaleString(LOCALE)} of ${total.toLocaleString(LOCALE)} selected`,
                  ]
                ),
              ]
            ),
            ...slotView("span", "bulk-acts", actions, h),
          ]
        ),
    },
    h
  );
};
