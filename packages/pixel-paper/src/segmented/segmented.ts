import { Button as UiButton } from "@foldkit/ui";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";

/** One segment: its value, its words, and optionally a glyph printed instead of the words. */
export type Segment<Value extends string> = Readonly<{
  value: Value;
  label: string;
  /** Prints the glyph alone; the label becomes its accessible name and its tip. */
  glyph?: GlyphName;
}>;

/** Configuration for rendering a segmented choice with `view`. */
export type ViewConfig<Value extends string, Message> = Readonly<{
  /** Names the group for screen readers. */
  label: string;
  options: ReadonlyArray<Segment<Value>>;
  value: Value;
  onSelect: (value: Value) => Message;
}>;

const segmentView = <Value extends string, Message>(
  config: ViewConfig<Value, Message>,
  option: Segment<Value>,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: config.onSelect(option.value),
      toView: (groups) =>
        h.keyed("button")(
          option.value,
          [
            ...groups.button,
            pressedAttribute(option.value === config.value, h),
            ...(option.glyph === undefined
              ? []
              : [
                  h.AriaLabel(option.label),
                  h.DataAttribute("tip", option.label),
                ]),
          ],
          [
            option.glyph === undefined
              ? option.label
              : Glyph.view({ name: option.glyph }, h),
          ]
        ),
    },
    h
  );

/** A choice of one: the pressed segment inverts and is `aria-pressed="true"`, the others
 *  `"false"`, in a `role="group"` named by the label. Words print as the nav strip; glyphs print as
 *  a compact switch of 26px cells (a layout, a density). */
export const view = <Value extends string, Message>(
  config: ViewConfig<Value, Message>,
  h: HtmlBuilder<Message>
): Html => {
  const isGlyphs = Array.every(
    config.options,
    (option) => option.glyph !== undefined
  );

  return h.div(
    [
      h.Role("group"),
      h.AriaLabel(config.label),
      h.Class(isGlyphs ? "switch" : "nav"),
    ],
    Array.map(config.options, (option) => segmentView(config, option, h))
  );
};
