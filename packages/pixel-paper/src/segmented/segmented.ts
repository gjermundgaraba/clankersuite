import { Button as UiButton } from "@foldkit/ui";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { pressedAttribute } from "../button/button.ts";

/** One segment: its value and its words. */
export type Segment<Value extends string> = Readonly<{
  value: Value;
  label: string;
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
          ],
          [option.label]
        ),
    },
    h
  );

/** A choice of one: the pressed segment inverts and is `aria-pressed="true"`, the others
 *  `"false"`, in a `role="group"` named by the label, printed as the nav strip. */
export const view = <Value extends string, Message>(
  config: ViewConfig<Value, Message>,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Role("group"), h.AriaLabel(config.label), h.Class("nav")],
    Array.map(config.options, (option) => segmentView(config, option, h))
  );
