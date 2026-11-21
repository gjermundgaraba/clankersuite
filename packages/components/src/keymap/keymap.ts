import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Text from "../text/text.ts";

export type KeymapRow = Readonly<{ keys: string; does: string }>;

export type KeymapGroup = Readonly<{
  title: string;
  rows: readonly KeymapRow[];
}>;

export type ViewConfig = Readonly<{
  groups: readonly KeymapGroup[];
  note?: string;
}>;

const rowView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ keys, does }: KeymapRow): Html =>
    h.keyed("div")(
      keys,
      [h.Class("gg-keymap-row")],
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

export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("gg-keymap")],
    [
      ...Array.map(config.groups, groupView(h)),
      ...(config.note === undefined ? [] : [Text.note([config.note], h)]),
    ]
  );
