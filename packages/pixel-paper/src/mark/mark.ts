import { Button as UiButton } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";

/** Configuration for rendering a mark with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Says what the mark means: its accessible name and its tip. */
  label: string;
  /** Where every row is marked, the mark prints plain: amber is for the one among many. */
  isPlain?: boolean;
  /** Makes the mark a toggle button, `aria-pressed` by `isPressed`. */
  onToggle?: Message;
  isPressed?: boolean;
}>;

/** The viewfinder glyph on amber: this one needs attention. Still, it is an image
 *  (`role="img"`) named by its label; with `onToggle`, a toggle button built on
 *  `@foldkit/ui`'s Button. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, isPlain = false, onToggle, isPressed = false } = config;
  const markClass = isPlain ? "mark plain" : "mark";
  const glyph = Glyph.view({ name: "mark" }, h);

  return onToggle === undefined
    ? h.span(
        [
          h.Role("img"),
          h.AriaLabel(label),
          h.DataAttribute("tip", label),
          h.Class(markClass),
        ],
        [glyph]
      )
    : UiButton.view(
        {
          onClick: onToggle,
          toView: (groups) =>
            h.button(
              [
                ...groups.button,
                h.AriaLabel(label),
                pressedAttribute(isPressed, h),
                h.DataAttribute("tip", label),
                h.Class(markClass),
              ],
              [glyph]
            ),
        },
        h
      );
};

export type ReadingConfig = Readonly<{
  label: string;
}>;

export const readingView = <Message>(
  config: ReadingConfig,
  h: HtmlBuilder<Message>
): Html => h.span([h.Class("mark reading")], [config.label]);
