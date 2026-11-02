import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** One property: its label, its value and its controls. */
export type Prop = Readonly<{
  /** Pixel caps; unique in the list. */
  label: string;
  value: ReadonlyArray<Html | string>;
  /** Prints the value as code: a key, an id, a path. */
  isCode?: boolean;
  /** Controls for the row, at the right: a copy button, an edit. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** Configuration for rendering a props list with `view`. */
export type ViewConfig = Readonly<{
  items: readonly Prop[];
}>;

const propView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ label, value, isCode = false, actions = [] }: Prop): Html =>
    h.keyed("div")(
      label,
      [],
      [
        h.dt([], [label]),
        h.dd([], isCode ? [h.code([], value)] : value),
        h.dd([h.Class("acts")], actions),
      ]
    );

/** A description list: a pixel-caps label, the value, and an action column, one 34px row
 *  each. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => h.dl([h.Class("props")], Array.map(config.items, propView(h)));
