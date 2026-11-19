import { Button as UiButton } from "@foldkit/ui";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";

/** The colours an application gives its areas and goals, each a token of its own. */
export type Marker = "Amber" | "Sky" | "Coral" | "Sand";

/** One place in Places: a link to its address (`href`), or a button that shows it in the page
 *  (`onSelect`). */
export type Place<Message> = PlaceContent<Message> & PlaceTarget<Message>;

export type PlaceContent<Message> = Readonly<{
  /** Stable and unique among the places: the row's key, so two places that share a name stay
   *  apart. */
  id: string;
  /** The place's name, in sans: it is authored. It wraps rather than clipping. */
  label: string;
  /** A 16px glyph before the name. */
  glyph?: GlyphName;
  /** A small square in the place's colour before the name, for an area or a goal; a glyph
   *  wins over it. */
  marker?: Marker;
  /** How many things wait there, right-aligned after the name, quiet. Screen readers hear it
   *  after a pause: "Inbox, 3". */
  count?: number;
  /** The place you are in, on the surface in a hairline ring:
   *  `aria-current="page"` on a link, `"true"` on a button, which shows the place without
   *  leaving the page. */
  isCurrent?: boolean;
  /** Places inside this one, as a list under it, indented to its name and smaller. */
  subPlaces?: ReadonlyArray<Place<Message>>;
}>;

export type PlaceTarget<Message> =
  | Readonly<{
      /** The place's address: the line is a link, so it opens in a new tab and reads as one. */
      href: string;
      onSelect?: never;
    }>
  | Readonly<{
      /** Shows the place without leaving the page: the line is a button. */
      onSelect: Message;
      href?: never;
    }>;

export type ViewConfig<Message> = Readonly<{
  /** Names the navigation for screen readers ("Areas"). */
  label: string;
  /** Prints the label above the places too, as the section's heading. */
  isLabelShown?: boolean;
  places: ReadonlyArray<Place<Message>>;
}>;

const leadView = <Message>(
  place: Place<Message>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  if (place.glyph !== undefined) {
    return [Glyph.view({ name: place.glyph }, h)];
  }

  return place.marker === undefined
    ? []
    : [
        h.span([
          h.AriaHidden(true),
          h.Class(`gg-place-marker gg-${place.marker.toLowerCase()}`),
        ]),
      ];
};

const lineView = <Message>(
  place: Place<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, count, isCurrent = false } = place;
  const number = count?.toLocaleString(LOCALE);

  const countedName =
    number === undefined ? [] : [h.AriaLabel(`${label}, ${number}`)];

  const content = [
    ...leadView(place, h),
    h.span([h.Class("gg-place-name")], [label]),
    ...(number === undefined
      ? []
      : [h.span([h.Class("gg-place-count gg-tnum")], [number])]),
  ];

  return place.href === undefined
    ? UiButton.view(
        {
          onClick: place.onSelect,
          toView: (groups) =>
            h.button(
              [
                ...groups.button,
                ...countedName,
                ...(isCurrent ? [h.AriaCurrent("true")] : []),
              ],
              content
            ),
        },
        h
      )
    : h.a(
        [
          h.Href(place.href),
          ...countedName,
          ...(isCurrent ? [h.AriaCurrent("page")] : []),
        ],
        content
      );
};

const listView = <Message>(
  places: ReadonlyArray<Place<Message>>,
  h: HtmlBuilder<Message>
): Html =>
  h.ul(
    [],
    Array.map(places, (place) =>
      h.keyed("li")(
        place.id,
        [],
        [
          lineView(place, h),
          ...(place.subPlaces === undefined ||
          !Array.isReadonlyArrayNonEmpty(place.subPlaces)
            ? []
            : [listView(place.subPlaces, h)]),
        ]
      )
    )
  );

/** A column of places to go (lists, areas, saved filters), flat in a sidebar: a navigation
 *  landmark named by its label, one line each a link to the place or a button built on
 *  `@foldkit/ui`'s Button, with a glyph or a colour marker, the name and a quiet count; the
 *  one you are in `aria-current` and on the surface. A place's sub-places list under it. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, isLabelShown = false, places } = config;

  return h.nav(
    [h.AriaLabel(label), h.Class("gg-places")],
    [
      ...(isLabelShown ? [h.h2([h.Class("gg-places-label")], [label])] : []),
      listView(places, h),
    ]
  );
};
