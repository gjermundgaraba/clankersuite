import { Array, Number, String, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { cellView } from "../glyph/glyph.ts";
import { artRows, toCells } from "../glyph/glyphs.ts";

const WORD_BREAK = /[\s._-]+/u;
const LETTER_COUNT = 2;

const initials = (name: string): string =>
  pipe(
    name.split(WORD_BREAK),
    Array.filter(String.isNonEmpty),
    Array.match({
      onEmpty: () => "",
      onNonEmpty: (words) =>
        words.length > 1
          ? pipe(
              Array.take(words, LETTER_COUNT),
              Array.map((word) => word.slice(0, 1)),
              Array.join("")
            )
          : Array.headNonEmpty(words).slice(0, LETTER_COUNT),
    })
  );

const DRAWN_CELL = 1;
const LARGE_DRAWN_CELL = 2;

const drawingView = <Message>(
  art: string,
  isLarge: boolean,
  h: HtmlBuilder<Message>
): Html => {
  const rows = artRows(art);

  const columns = Array.reduce(rows, 0, (widest, row) =>
    Number.max(widest, row.length)
  );

  const cell = isLarge ? LARGE_DRAWN_CELL : DRAWN_CELL;

  return h.svg(
    [
      h.ViewBox(`0 0 ${columns} ${rows.length}`),
      h.Width(`${columns * cell}`),
      h.Height(`${rows.length * cell}`),
      h.AriaHidden(true),
      h.Class("px-icon"),
    ],
    Array.map(toCells(art, columns), cellView(h))
  );
};

/** Configuration for rendering a monogram with `view`. */
export type ViewConfig = Readonly<{
  /** Whose mark it is; screen readers read it, and it gives the letters. */
  label: string;
  /** One or two letters, when the name's initials are not the ones people know. */
  letters?: string;
  /** A mark the product draws in cells, in place of the letters: rows of `#` (ink) and `.`,
   *  as a glyph is drawn, on a grid of up to 16 for a large monogram. It prints bare, in ink,
   *  a pixel per cell (two when large): a provider's own mark redrawn in the system's
   *  cells, never a picture or a brand colour. */
  drawing?: string;
  /** 34px, beside a name set large (a card of readings, a wall). */
  isLarge?: boolean;
  /** You, among others: the monogram inverts. */
  isCurrent?: boolean;
  /** Beside the same name in words (as in Identity): hidden from screen readers, which read
   *  the name once, from the words. */
  isDecorative?: boolean;
}>;

/** Letters in an ink square, or a mark the product draws in cells: the identity of a person,
 *  a provider or a source. An image named by `label`, or hidden when `isDecorative`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const {
    label,
    letters,
    drawing,
    isLarge = false,
    isCurrent = false,
    isDecorative = false,
  } = config;

  return h.span(
    [
      ...(isDecorative
        ? [h.AriaHidden(true)]
        : [h.Role("img"), h.AriaLabel(label)]),
      h.Class(
        `monogram${drawing === undefined ? "" : " drawn"}${isLarge ? " large" : ""}${isCurrent ? " current" : ""}`
      ),
    ],
    [
      drawing === undefined
        ? (letters ?? initials(label))
        : drawingView(drawing, isLarge, h),
    ]
  );
};
