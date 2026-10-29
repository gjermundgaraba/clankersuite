import { Button as UiButton } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";

/** Configuration for rendering a filter chip with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The value, the chip's words: "open", "this week". */
  label: string;
  /** The chip written out, when its words alone do not say it ("Clear scope: Operations" for
   *  "Operations ×"): its name for screen readers and its tip for everyone else. */
  full?: string;
  /** In force: printed inverted. */
  isPressed?: boolean;
  /** Makes the chip a toggle button (`aria-pressed`); without it, a pinned label. */
  onToggle?: Message;
  /** The quiet chip that clears the filters: a plain button, never pressed. */
  isReset?: boolean;
  /** The chip's stable id among its siblings, for chips mapped from a list that changes. */
  key?: string;
}>;

/** A filter as a chip. With `onToggle` it is a toggle button built on `@foldkit/ui`'s Button,
 *  `aria-pressed` while in force; without, a label, inverted while pinned. With `full`, screen
 *  readers hear the full words and the eye gets them as a tip. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    label,
    full,
    isPressed = false,
    onToggle,
    isReset = false,
    key,
  } = config;

  const fullAttributes =
    full === undefined ? [] : [h.DataAttribute("tip", full)];

  const keyAttributes = key === undefined ? [] : [h.Key(key)];

  return onToggle === undefined
    ? h.span(
        [
          ...keyAttributes,
          ...fullAttributes,
          h.Class(isPressed ? "fchip pinned" : "fchip"),
        ],
        full === undefined
          ? [label]
          : [
              h.span([h.AriaHidden(true)], [label]),
              h.span([h.Class("sr-only")], [full]),
            ]
      )
    : UiButton.view(
        {
          onClick: onToggle,
          toView: (groups) =>
            h.button(
              [
                ...groups.button,
                ...keyAttributes,
                ...fullAttributes,
                ...(full === undefined ? [] : [h.AriaLabel(full)]),
                ...(isReset ? [] : [pressedAttribute(isPressed, h)]),
                h.Class(isReset ? "fchip reset" : "fchip"),
              ],
              [label]
            ),
        },
        h
      );
};
