import { Array, String, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

const WORD_BREAK = /[^\p{L}\p{N}]+/u;
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

export type ViewConfig = Readonly<{
  label: string;
  isLarge?: boolean;
}>;

/** Letters in a bordered, rounded square: the identity of a person, a provider or a source.
 *  They are the first letter or digit of each of the label's first two words, or the first two
 *  of a single word; punctuation is no part of a word, so "Factory (Droid)" prints FD. It sits
 *  beside the same name in words (as in Identity), so it is hidden from screen readers, which
 *  read the name once, from the words. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, isLarge = false } = config;

  return h.span(
    [
      h.AriaHidden(true),
      h.Class(isLarge ? "gg-monogram gg-large" : "gg-monogram"),
    ],
    [initials(label)]
  );
};
