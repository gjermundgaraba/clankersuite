import { Array, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** How the columns sit. `Versions`: a narrow who column, for a version log. `Checks`: a wider
 *  one, for a log of readings. */
export const Variant = Schema.Literals(["Versions", "Checks"]);

export type Variant = typeof Variant.Type;

/** One entry in the log. */
export type Entry = Readonly<{
  /** Stable across renders and pages: the entry's own id. */
  id: string;
  /** The first column, in the pixel face: a version, a Time. */
  at: ReadonlyArray<Html | string>;
  /** Who or what: an author, a meter, a client. */
  who?: ReadonlyArray<Html | string>;
  what: ReadonlyArray<Html | string>;
  /** The version in force prints inverted. */
  isCurrent?: boolean;
  /** Controls at the end of the entry: restore, view. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** Configuration for rendering a history with `view`. */
export type ViewConfig = Readonly<{
  /** Newest first. Page an endless log with a control under the list (`"older activity"`)
   *  that asks the caller for the next page, and an EmptyState once nothing is left. */
  entries: readonly Entry[];
  variant?: Variant;
  /** Each entry in full on two lines: when and who, then what, wrapping as long as it runs.
   *  For an activity log whose words matter more than a tidy column. */
  isWrapped?: boolean;
  /** Names the list for screen readers: `"Workspace activity, newest first"`. */
  label?: string;
}>;

const entryView =
  <Message>(h: HtmlBuilder<Message>) =>
  (entry: Entry): Html =>
    h.keyed("li")(
      entry.id,
      entry.isCurrent === true
        ? [h.AriaCurrent("true"), h.Class("current")]
        : [],
      [
        h.span([h.Class("v tnum")], entry.at),
        ...(entry.who === undefined
          ? []
          : [h.span([h.Class("who")], entry.who)]),
        h.span([h.Class("what")], entry.what),
        ...(entry.actions ?? []),
      ]
    );

/** A ruled log, in an ordered list: when, who, what, and the controls for each entry. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { entries, variant = "Versions", isWrapped = false, label } = config;

  return h.ol(
    [
      ...(label === undefined ? [] : [h.AriaLabel(label)]),
      h.Class(
        `history-list${variant === "Checks" ? " checks" : ""}${isWrapped ? " wrapped" : ""}`
      ),
    ],
    Array.map(entries, entryView(h))
  );
};
