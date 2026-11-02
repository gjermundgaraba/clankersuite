import { Button as UiButton } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a tag with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The tag as printed: a count, a group name, a scope. */
  label: string;
  /** The tag written out, when it is abbreviated or clipped ("3 in Operations" for "3"): its
   *  name for screen readers and its tip for everyone else. */
  full?: string;
  /** Makes the tag a button. */
  onClick?: Message;
  /** The tag's stable id among its siblings, for tags mapped from a list that changes. */
  key?: string;
}>;

/** A small muted label on a 1px rule. With `full`, screen readers hear the full words and
 *  the eye gets them as a tip; with `onClick`, a button built on `@foldkit/ui`'s Button. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, full, onClick, key } = config;

  const fullAttributes =
    full === undefined ? [] : [h.DataAttribute("tip", full)];

  const keyAttributes = key === undefined ? [] : [h.Key(key)];

  return onClick === undefined
    ? h.span(
        [...keyAttributes, ...fullAttributes, h.Class("tag")],
        full === undefined
          ? [label]
          : [
              h.span([h.AriaHidden(true)], [label]),
              h.span([h.Class("sr-only")], [full]),
            ]
      )
    : UiButton.view(
        {
          onClick,
          toView: (groups) =>
            h.button(
              [
                ...groups.button,
                ...keyAttributes,
                ...fullAttributes,
                ...(full === undefined ? [] : [h.AriaLabel(full)]),
                h.Class("tag"),
              ],
              [h.span([], [label])]
            ),
        },
        h
      );
};
