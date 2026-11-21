import { Glyph } from "@gjermundgaraba/icons";
import { Array, Number, String, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

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
  const rows = Glyph.artRows(art);

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
      h.Class("gg-icon"),
    ],
    Array.map(Glyph.toCells(art, columns), Glyph.cellView(h))
  );
};

export type ViewConfig = Readonly<{
  label: string;
  drawing?: string;
  isLarge?: boolean;
}>;

export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, drawing, isLarge = false } = config;

  return h.span(
    [
      h.AriaHidden(true),
      h.Class(
        `gg-monogram${drawing === undefined ? "" : " gg-drawn"}${isLarge ? " gg-large" : ""}`
      ),
    ],
    [drawing === undefined ? initials(label) : drawingView(drawing, isLarge, h)]
  );
};
