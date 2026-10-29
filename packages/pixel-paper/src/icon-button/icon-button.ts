import { Button as UiButton } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import type { KeyHintConfig } from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import { keyLabel } from "../key-hint/key-label.ts";

/** Configuration for rendering an icon button with `view`. */
export type ViewConfig<Message> = Readonly<{
  glyph: GlyphName;
  /** The button has no visible text: the label is its name and its tip. */
  label: string;
  onClick?: Message;
  /** Muted until hovered: row tools and copy buttons. */
  isQuiet?: boolean;
  /** Unavailable but focusable (`aria-disabled`), as in `@foldkit/ui`. */
  isDisabled?: boolean;
  /** The key that does the same, printed in the tip after the label (`data-tip-key`): the
   *  button has no words to print it beside. */
  keyHint?: KeyHintConfig;
  /** Further attributes for the `<button>`, never a class. */
  attributes?: Attributes<Message>;
}>;

/** A bare glyph button, 24px square. Its label is its accessible name and its tip, and its
 *  key, where it has one, prints in the tip after the label. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    glyph,
    label,
    onClick,
    isQuiet = false,
    isDisabled = false,
    keyHint,
    attributes = [],
  } = config;

  return UiButton.view(
    {
      ...(onClick !== undefined && { onClick }),
      isDisabled,
      toView: (groups) =>
        h.button(
          [
            ...attributes,
            ...groups.button,
            h.AriaLabel(label),
            h.DataAttribute("tip", label),
            ...(keyHint === undefined
              ? []
              : [
                  h.DataAttribute(
                    "tip-key",
                    keyLabel(keyHint.keys, keyHint.platform)
                  ),
                ]),
            h.Class(isQuiet ? "iconbtn quiet" : "iconbtn"),
          ],
          [Glyph.view({ name: glyph }, h)]
        ),
    },
    h
  );
};
