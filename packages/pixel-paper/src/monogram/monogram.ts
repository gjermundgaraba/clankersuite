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
  /** Whose mark it is: it gives the letters. */
  label: string;
  /** A mark the product draws in cells, in place of the letters: rows of `#` (ink) and `.`,
   *  as a glyph is drawn, on a grid of up to 16 for a large monogram. It prints bare, in ink,
   *  a pixel per cell (two when large): a provider's own mark redrawn in the system's
   *  cells, never a picture or a brand colour. */
  drawing?: string;
  /** 34px, beside a name set large (a card of readings, a wall). */
  isLarge?: boolean;
}>;

/** Letters in an ink square, or a mark the product draws in cells: the identity of a person,
 *  a provider or a source. It sits beside the same name in words (as in Identity), so it is
 *  hidden from screen readers, which read the name once, from the words. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, drawing, isLarge = false } = config;

  return h.span(
    [
      h.AriaHidden(true),
      h.Class(
        `monogram${drawing === undefined ? "" : " drawn"}${isLarge ? " large" : ""}`
      ),
    ],
    [drawing === undefined ? initials(label) : drawingView(drawing, isLarge, h)]
  );
};
