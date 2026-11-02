import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** One key and what it does, both as printed. */
export type KeymapRow = Readonly<{ keys: string; does: string }>;

/** A heading and the keys under it. */
export type KeymapGroup = Readonly<{
  title: string;
  rows: readonly KeymapRow[];
}>;

/** Configuration for rendering a keymap with `view`. */
export type ViewConfig = Readonly<{
  groups: readonly KeymapGroup[];
  /** A closing sans sentence: when the keys act. */
  note?: string;
}>;

const rowView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ keys, does }: KeymapRow): Html =>
    h.keyed("div")(
      keys,
      [h.Class("keymap-row")],
      [h.kbd([], [keys]), h.span([], [does])]
    );

const groupView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ title, rows }: KeymapGroup): Html =>
    h.keyed("div")(
      title,
      [],
      [h.h3([], [title]), ...Array.map(rows, rowView(h))]
    );

/** Keys and what they do, grouped under `h3` headings, each key in a `kbd`, in the pixel
 *  face. Sits in a narrow Card. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("keymap")],
    [
      ...Array.map(config.groups, groupView(h)),
      ...(config.note === undefined
        ? []
        : [h.p([h.Class("note-line")], [config.note])]),
    ]
  );
