import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { countParts } from "../count/count.ts";
import * as Marker from "../marker/marker.ts";

/** `Go`: fine, on track (the accent). `Warn`: a warning the row carries, such as due today
 *  (amber). `Blocked`: urgent, such as overdue (red). `Done`: finished, quiet. Each tone but
 *  `Plain` and `Done` prints on a soft ground of its colour. Colour only ever means fine, a
 *  warning or urgent. */
export const Tone = Schema.Literals(["Plain", "Go", "Warn", "Blocked", "Done"]);

export type Tone = typeof Tone.Type;

export type ViewConfig = Readonly<{
  /** The chip's words: a state, a date, a goal. */
  label: string;
  tone?: Tone;
  /** A 12px glyph before the words: a flag on a due date, a calendar on a day. */
  glyph?: GlyphName;
  /** A Marker before the words: an area's square, or a goal's dot (`kind: "Goal"`). */
  marker?: Marker.ViewConfig;
  /** A count after the words, quiet: how many of the page's tasks serve the goal. A linked
   *  chip's name reads it after a pause. */
  count?: number;
  /** No ground and no ring, only the words and the glyph: a date or a count in a row's meta
   *  that need not stand out. */
  isFlat?: boolean;
  /** Taller and roomier, for a strip of chips under a page's head. */
  isLarge?: boolean;
  /** Makes the chip a link to this address: a goal in a strip opens the goal. */
  href?: string;
  /** Working on it (polling, building, starting): the word gains a spinner,
   *  and the chip says so (`aria-busy`). */
  isBusy?: boolean;
}>;

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  Plain: "",
  Go: " gg-go",
  Warn: " gg-warn",
  Blocked: " gg-blocked",
  Done: " gg-done",
};

const classOf = (config: ViewConfig): string =>
  `gg-chip${TONE_CLASS[config.tone ?? "Plain"]}${
    config.isFlat === true ? " gg-flat" : ""
  }${config.isLarge === true ? " gg-large" : ""}`;

/** A word in a pill: a state, a date, a goal. Its words are its meaning; the colour only
 *  repeats them. With `href`, a link. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, glyph, marker, count, href, isBusy = false } = config;
  const counted = countParts(label, count, h);

  const pause =
    href === undefined && count !== undefined
      ? [h.span([h.Class("sr-only")], [", "])]
      : [];

  const content = [
    ...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]),
    ...(marker === undefined ? [] : [Marker.view(marker, h)]),
    label,
    ...pause,
    ...counted.view,
    ...(isBusy ? [h.span([h.Class("gg-spinner"), h.AriaHidden(true)])] : []),
  ];

  const busyAttributes = isBusy ? [h.AriaBusy(true)] : [];

  return href === undefined
    ? h.span([...busyAttributes, h.Class(classOf(config))], content)
    : h.a(
        [
          ...busyAttributes,
          h.Href(href),
          ...counted.name,
          h.Class(classOf(config)),
        ],
        content
      );
};

export type DotConfig = Readonly<{
  /** The state word: the dot's accessible name and its tip. */
  label: string;
  tone?: Tone;
}>;

/** A chip as a small dot in its tone, where a word would take the room a title needs (a task
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
    h.DataAttribute("gg-tip", label),
    h.Class(`gg-chip-dot${TONE_CLASS[tone]}`),
  ]);
};
