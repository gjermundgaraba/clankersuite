import { Array, Number, Option, Schema } from "effect";
import { defineTaggedUnion } from "foldkit/schema";

import { htmlElement } from "../dom/html-element.ts";
import {
  Resize,
  Splitter,
  Subject,
  Target,
  firstPlace,
  placeAt,
  placeOf,
  subjectWords,
} from "./layout.ts";
import type { Layout, Pane, Place } from "./layout.ts";

const KEYBOARD_MOVES =
  "Arrow keys move it, space drops it, escape or tab puts it back.";

export const COPY = {
  paneGrip: "Move {pane}",
  gripHelp: `Press space to pick it up. ${KEYBOARD_MOVES}`,
  widthLabel: "Width of column {column}",
  heightLabel: "Height of {pane}",
  focused: "{pane}, {where}.",
  focusedTab: "{pane}, tab {tab} of {tabs}.",
  moved: "{subject} moved to {where}.",
  widened: "Column {column} takes {width}.",
  pickedUp: "Picked up {subject}.",
  pickedUpByKeyboard: `Picked up {subject}. ${KEYBOARD_MOVES}`,
  over: "{subject}, {where}.",
  dropped: "{subject} dropped at {where}.",
  putBack: "{subject} put back where it was.",
  cancelled: "Move cancelled. {subject} put back where it was.",
  gone: "Move cancelled.",
};

const Focus = Schema.Struct({
  paneId: Schema.String,
  column: Schema.Finite,
  row: Schema.Finite,
});

export const By = defineTaggedUnion({
  Pointer: {
    pointerId: Schema.Finite,
    pressX: Schema.Finite,
    pressY: Schema.Finite,
    x: Schema.Finite,
    y: Schema.Finite,
    isCarrying: Schema.Boolean,
  },
  Keyboard: {},
});

export type By = typeof By.Type;

export const Held = Schema.Struct({
  paneId: Schema.String,
  by: By,
  maybeTarget: Schema.Option(Target),
});

export type Held = typeof Held.Type;

export const Resizing = Schema.Struct({
  splitter: Splitter,
  pointerId: Schema.Finite,
  pressX: Schema.Finite,
  pressY: Schema.Finite,
  maybeResize: Schema.Option(Resize),
});

export type Resizing = typeof Resizing.Type;

/** Schema for a reel: its id, the focused pane, what is held and a splitter being dragged. All
 *  of it is this client's; the layout is the application's. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeFocus: Schema.Option(Focus),
  maybeHeld: Schema.Option(Held),
  maybeResizing: Schema.Option(Resizing),
});

export type Model = typeof Model.Type;

/** How a reel shows its panes: side by side in their columns (`Strip`), or one at a time at
 *  the reel's full size under a tab per pane (`Tabs`). The application holds it and passes it
 *  in; the layout is the same in both. */
export const Arrangement = Schema.Literals(["Strip", "Tabs"]);

export type Arrangement = typeof Arrangement.Type;

/** Configuration for creating a reel with `init`. The `id` must be unique in the document;
 *  the commands find its parts through it. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a reel focused on its first pane, holding nothing, at rest. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeFocus: Option.none(),
  maybeHeld: Option.none(),
  maybeResizing: Option.none(),
});

export const focusedPlace = (
  model: Model,
  layout: Layout
): Option.Option<Place> =>
  Option.orElse(
    Option.flatMap(model.maybeFocus, (focus) =>
      Option.orElse(placeOf(layout, focus.paneId), () => {
        const column = Number.clamp(focus.column, {
          minimum: 0,
          maximum: layout.length - 1,
        });

        const rows = Option.match(Array.get(layout, column), {
          onNone: () => 0,
          onSome: (found) => found.panes.length,
        });

        return placeAt(
          layout,
          column,
          Number.clamp(focus.row, { minimum: 0, maximum: rows - 1 })
        );
      })
    ),
    () => firstPlace(layout)
  );

/** The pane focus is on: the one last focused, or, when it has gone from `layout`, the pane
 *  now nearest its place; the first pane before any is focused. None for an empty layout. */
export const focusedPaneId = (
  model: Model,
  layout: Layout
): Option.Option<string> =>
  Option.map(focusedPlace(model, layout), ({ pane }) => pane.id);

export const isHolding = (model: Model): boolean =>
  Option.isSome(model.maybeHeld);

export const isIdle = (model: Model): boolean =>
  !isHolding(model) && Option.isNone(model.maybeResizing);

export const isCarried = (held: Held): boolean =>
  By.match(held.by, {
    Pointer: ({ isCarrying }) => isCarrying,
    Keyboard: () => true,
  });

/** A part of a reel the commands find again: each prints its id, bare, in
 *  `data-gg-reel-<part>`, and the reel's root prints the reel's in `data-gg-reel`. */
export type Part = "pane" | "column" | "tab";

/** The selector for this reel's `part` with the id `id`. */
export const partSelector = (reelId: string, part: Part, id: string): string =>
  `[data-gg-reel="${CSS.escape(reelId)}"] [data-gg-reel-${part}="${CSS.escape(id)}"]`;

export const scrollerOf = (reelId: string): Option.Option<HTMLElement> =>
  htmlElement(`[data-gg-reel="${CSS.escape(reelId)}"] > .gg-reel-view`);

export const paneElement = (
  reelId: string,
  paneId: string
): Option.Option<HTMLElement> =>
  htmlElement(partSelector(reelId, "pane", paneId));

/** The id of the pane that holds `element`, if one does: for keys that act on the pane they
 *  were pressed in. */
export const paneIdAt = (element: Element): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(element.closest<HTMLElement>("[data-gg-reel-pane]")),
    (pane) => Option.fromNullishOr(pane.dataset["ggReelPane"])
  );

/** Whether `element` is a reel's strip, the element that scrolls its columns sideways (not a
 *  scroll inside one of its panes). */
export const isScroller = (element: Element): boolean =>
  element.matches("[data-gg-reel] > .gg-reel-view");

/** Marks the control inside a pane that focus lands on when the reel focuses the pane (a
 *  terminal's input), for a control a Mount creates. A view marks it with
 *  `h.DataAttribute("gg-reel-focus", "")`. */
export const markFocusTarget = (element: HTMLElement): void => {
  element.dataset["ggReelFocus"] = "";
};

export const focusInto = (pane: HTMLElement): void => {
  Option.getOrElse(htmlElement("[data-gg-reel-focus]", pane), () => pane).focus(
    {
      preventScroll: true,
    }
  );
};

export const heldLabel = (layout: Layout, held: Held): string =>
  Option.getOrElse(
    subjectWords(layout, Subject.Pane({ paneId: held.paneId })),
    () => ""
  );

export const readingOrder = (layout: Layout): readonly Pane[] =>
  Array.flatMap(layout, (column) => column.panes);
