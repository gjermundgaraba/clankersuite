import { Button as UiButton } from "@foldkit/ui";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";
import { slotView } from "../slot/slot.ts";

/** One place in Places: a link to its address (`href`), or a button that shows it in the page
 *  (`onSelect`). */
export type Place<Message> = PlaceContent & PlaceTarget<Message>;

export type PlaceContent = Readonly<{
  /** Stable and unique among the places: the row's key, so two places that share a name stay
   *  apart. */
  id: string;
  /** The place's name, in sans: it is authored. It wraps rather than clipping. */
  label: string;
  /** The place you are in: `aria-current="page"`, printed inverted. */
  isCurrent?: boolean;
  /** How many things it holds, in the pixel face at the right. */
  count?: number;
  /** A quiet IconButton after it that acts on the place itself (remove a saved filter). */
  tools?: readonly Html[];
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

/** Configuration for rendering places with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** Names the navigation for screen readers ("Areas"). */
  label: string;
  places: ReadonlyArray<Place<Message>>;
}>;

const lineView = <Message>(
  place: Place<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, isCurrent = false, count } = place;
  const current = isCurrent ? [h.AriaCurrent("page")] : [];

  const content = [
    h.span([h.Class("place-name")], [label]),
    ...(count === undefined
      ? []
      : [
          " ",
          h.span([h.Class("place-count")], [count.toLocaleString(LOCALE)]),
        ]),
  ];

  return place.href === undefined
    ? UiButton.view(
        {
          onClick: place.onSelect,
          toView: (groups) => h.button([...groups.button, ...current], content),
        },
        h
      )
    : h.a([h.Href(place.href), ...current], content);
};

const placeView =
  <Message>(h: HtmlBuilder<Message>) =>
  (place: Place<Message>): Html =>
    h.keyed("li")(
      place.id,
      [],
      [
        lineView(place, h),
        ...slotView("span", "place-tools", place.tools ?? [], h),
      ]
    );

/** A column of places to go (areas, collections, saved filters), flush in a rail panel: a
 *  navigation landmark named by its label, one line each a link to the place or a button built
 *  on `@foldkit/ui`'s Button, the one you are in `aria-current="page"` and printed inverted. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, places } = config;

  return h.nav(
    [h.AriaLabel(label), h.Class("places")],
    [h.ul([], Array.map(places, placeView(h)))]
  );
};
