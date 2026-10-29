import { Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** `Go`: active (green). `Warn`: a warning the row carries (amber). `Blocked`: a red outline.
 *  `Done`: tinted. Colour only ever means active, warning or urgent. */
export const Tone = Schema.Literals(["Plain", "Go", "Warn", "Blocked", "Done"]);

export type Tone = typeof Tone.Type;

/** Configuration for rendering a chip with `view`. */
export type ViewConfig = Readonly<{
  /** The state word. */
  label: string;
  tone?: Tone;
  /** Working on it (polling, building, starting): the word gains the blinking block cursor,
   *  and the chip says so (`aria-busy`). */
  isBusy?: boolean;
}>;

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  Plain: "",
  Go: " go",
  Warn: " warn",
  Blocked: " blocked",
  Done: " done",
};

/** A state word in a 2px box. Its words are its meaning; the colour only repeats them. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, tone = "Plain", isBusy = false } = config;

  return h.span(
    [...(isBusy ? [h.AriaBusy(true)] : []), h.Class(`chip${TONE_CLASS[tone]}`)],
    [
      label,
      ...(isBusy ? [h.span([h.Class("cursor"), h.AriaHidden(true)])] : []),
    ]
  );
};

/** Configuration for rendering a dot with `dotView`. */
export type DotConfig = Readonly<{
  /** The state word: the dot's accessible name and its tip. */
  label: string;
  tone?: Tone;
}>;

/** A chip as a 10px cell in its tone, where a word would take the room a title needs (a task
 *  row's status, before its title). It is an image (`role="img"`) named by the word, which its
 *  tip shows, so the state never rests on its colour. */
export const dotView = <Message>(
  config: DotConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, tone = "Plain" } = config;

  return h.span([
    h.Role("img"),
    h.AriaLabel(label),
    h.DataAttribute("tip", label),
    h.Class(`chip-dot${TONE_CLASS[tone]}`),
  ]);
};
