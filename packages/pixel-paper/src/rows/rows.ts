import { Button as UiButton, Checkbox as UiCheckbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import { slotView } from "../slot/slot.ts";

/** Configuration for rendering a list of rows with `view`. */
export type ViewConfig = Readonly<{
  /** Each made with `rowView`. */
  rows: readonly Html[];
  /** An outline: nested rows indent 26px and hang on a 1px rule guide. */
  isOutline?: boolean;
  /** Names the list for screen readers; a treegrid needs it. */
  label?: string;
  /** A keyboard-driven list, whose cursor the application moves (see Keys in DESIGN.md): a
   *  `role="treegrid"`, so a screen reader hands it the arrow and letter keys. Give every row
   *  its `treegrid` place. */
  isTreegrid?: boolean;
}>;

/** A list of 34px rows. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.ul(
    [
      ...(config.isTreegrid === true ? [h.Role("treegrid")] : []),
      ...(config.label === undefined ? [] : [h.AriaLabel(config.label)]),
      h.Class(config.isOutline === true ? "rows tree" : "rows"),
    ],
    config.rows
  );

/** A selectable row's checkbox, held in the caller's Model. Its cell inverts while checked; the
 *  row's text is its label, so a click anywhere on the text toggles it. */
export type RowSelect<Message> = Readonly<{
  /** Unique in the document: the id of the box's name is made from it. The box itself has no
   *  id. */
  id: string;
  isChecked: boolean;
  /** The box's next state. */
  onToggle: (isChecked: boolean) => Message;
}>;

/** A row's place in a treegrid (`view`'s `isTreegrid`): its line is a `role="row"` and each
 *  of its parts a `role="gridcell"`, while the list items around them step aside
 *  (`role="none"`). */
export type TreegridPlace = Readonly<{
  /** Its depth, from 1 at the list's roots: `aria-level`. */
  level: number;
  /** Its place among its siblings, from 1: `aria-posinset`. */
  position: number;
  /** How many siblings it has, itself included: `aria-setsize`. */
  setSize: number;
  /** Whether the rows under it show, for a row that folds: `aria-expanded`. */
  isExpanded?: boolean;
}>;

/** Configuration for rendering a row with `rowView`. */
export type RowConfig<Message> = Readonly<{
  /** The row's stable id among its siblings. */
  key: string;
  /** The 18px glyph slot at the left: a `glyphView`, a `toggleView`, or a status as a
   *  `Chip.dotView`. */
  glyph?: Html;
  /** The row's text; it takes the free width and ellipsises. */
  body: ReadonlyArray<Html | string>;
  /** Right-aligned chips, marks, counts, due days. */
  slot?: ReadonlyArray<Html | string>;
  /** Further attributes for the slot's `span.slot`, such as an id the row's line is described
   *  by (`aria-describedby`); there is no span, and so nothing to point at, while `slot` is
   *  empty. Never a class. */
  slotAttributes?: Attributes<Message>;
  /** Controls that belong to the row's job, before the tools (an approve and reject pair). */
  actions?: ReadonlyArray<Html | string>;
  /** Icon buttons at the row's right end, dimmed until the row is hovered or focused (full
   *  on the cursor row) and hidden on a phone: `span.tools`. */
  tools?: ReadonlyArray<Html | string>;
  /** Rows under this one, in an outline, each made with `rowView`. */
  nested?: readonly Html[];
  /** Outside a filter, printed only to keep a match on its chain: muted, and "(context)"
   *  after its text for screen readers, which the muting does not reach. In a selectable
   *  row the text names the box, so the box's name says it too. */
  isContext?: boolean;
  /** The row's text holds one link (a task, a page), and the row's whole box is its target: a
   *  press anywhere on the row follows it, while the row's own controls (the box, a toggle,
   *  the actions and tools) and whatever has a tip stay their own targets. The row takes no
   *  Tab stop of its own, and the link's ring is drawn round the row. A link that is
   *  `aria-current` inverts the row. For a list no keyboard drives: a treegrid's row (with
   *  `treegrid`) is already its own stop, and ignores it. */
  isLink?: boolean;
  /** Makes the row selectable: a box at its left edge. */
  select?: RowSelect<Message>;
  /** The row's place in a treegrid; every row of a treegrid has one. */
  treegrid?: TreegridPlace;
  /** Further attributes for the row's line, the `div.row`, not its `li`: a keyboard list's
   *  cursor (`aria-current="true"`, which the stylesheet outlines, and a roving `tabindex`),
   *  its name (with `role="group"` outside a treegrid, whose row is already a named `row`), data
   *  attributes, key and focus handlers. Never a class. */
  attributes?: Attributes<Message>;
}>;

const cellRole = <Message>(
  config: RowConfig<Message>,
  h: HtmlBuilder<Message>
): Attributes<Message> =>
  config.treegrid === undefined ? [] : [h.Role("gridcell")];

const rowRole = <Message>(
  place: TreegridPlace | undefined,
  h: HtmlBuilder<Message>
): Attributes<Message> =>
  place === undefined
    ? []
    : [
        h.Role("row"),
        h.AriaLevel(place.level),
        h.AriaPosinset(place.position),
        h.AriaSetsize(place.setSize),
        ...(place.isExpanded === undefined
          ? []
          : [h.AriaExpanded(place.isExpanded)]),
      ];

const cellView = <Message>(
  config: RowConfig<Message>,
  className: string,
  content: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): ReadonlyArray<Html | string> =>
  config.treegrid === undefined
    ? content
    : slotView("span", className, content, h, cellRole(config, h));

const textOf = <Message>(
  config: RowConfig<Message>,
  h: HtmlBuilder<Message>
): ReadonlyArray<Html | string> =>
  config.isContext === true
    ? [...config.body, h.span([h.Class("sr-only")], [" (context)"])]
    : config.body;

const lineView = <Message>(
  config: RowConfig<Message>,
  box: readonly Html[],
  text: Html,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [
      ...(config.attributes ?? []),
      ...rowRole(config.treegrid, h),
      h.Class(
        `row${config.isContext === true ? " context" : ""}${
          config.isLink === true && config.treegrid === undefined
            ? " linked"
            : ""
        }`
      ),
    ],
    [
      ...box,
      ...cellView(
        config,
        "cell",
        config.glyph === undefined ? [] : [config.glyph],
        h
      ),
      text,
      ...slotView("span", "slot", config.slot ?? [], h, [
        ...(config.slotAttributes ?? []),
        ...cellRole(config, h),
      ]),
      ...cellView(config, "cell actions", config.actions ?? [], h),
      ...slotView("span", "tools", config.tools ?? [], h, cellRole(config, h)),
    ]
  );

const selectableLineView = <Message>(
  config: RowConfig<Message>,
  select: RowSelect<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiCheckbox.view(
    {
      id: select.id,
      isChecked: select.isChecked,
      onToggle: select.onToggle,
      toView: (groups) =>
        lineView(
          config,
          [
            h.span(
              [...cellRole(config, h), h.Class("row-check")],
              [h.button(groups.checkbox)]
            ),
          ],
          config.treegrid === undefined
            ? h.label([...groups.label, h.Class("grow")], textOf(config, h))
            : h.span(
                [...cellRole(config, h), h.Class("cell grow-cell")],
                [h.label([...groups.label, h.Class("grow")], textOf(config, h))]
              ),
          h
        ),
    },
    h
  );

/** One 34px row: box, glyph, text, slot, actions, tools, and the rows nested under it. Hover
 *  and focus tint it head. The box of a selectable row is built on `@foldkit/ui`'s Checkbox:
 *  a `role="checkbox"` button (`aria-checked`) whose whole cell is its target. In a treegrid
 *  the line is the `role="row"` and each part a `role="gridcell"`. */
export const rowView = <Message>(
  config: RowConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const listRole = config.treegrid === undefined ? [] : [h.Role("none")];

  return h.keyed("li")(config.key, listRole, [
    config.select === undefined
      ? lineView(
          config,
          [],
          h.div([...cellRole(config, h), h.Class("grow")], textOf(config, h)),
          h
        )
      : selectableLineView(config, config.select, h),
    ...slotView("ul", "rows", config.nested ?? [], h, listRole),
  ]);
};

/** Configuration for rendering a glyph slot with `glyphView`. */
export type GlyphConfig = Readonly<{
  name: GlyphName;
}>;

/** A glyph in the row's 18px slot. */
export const glyphView = <Message>(
  config: GlyphConfig,
  h: HtmlBuilder<Message>
): Html => h.span([h.Class("glyph")], [Glyph.view({ name: config.name }, h)]);

/** Configuration for rendering a fold toggle with `toggleView`. */
export type ToggleConfig<Message> = Readonly<{
  isExpanded: boolean;
  /** What the nested rows hang under: the toggle is named `"Rows under Notes"` whether open
   *  or not, and `aria-expanded` says which. */
  label: string;
  onToggle: Message;
}>;

/** The glyph slot as a fold toggle, built on `@foldkit/ui`'s Button: a ring, open or closed,
 *  `aria-expanded`, named for the rows it shows. */
export const toggleView = <Message>(
  config: ToggleConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: config.onToggle,
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            h.AriaExpanded(config.isExpanded),
            h.AriaLabel(`Rows under ${config.label}`),
            h.Class("glyph"),
          ],
          [Glyph.view({ name: config.isExpanded ? "ring" : "ring-closed" }, h)]
        ),
    },
    h
  );

/** Configuration for rendering a row's title with `titleView`. */
export type TitleConfig<Message> = Readonly<{
  label: string;
  onOpen: Message;
  /** Closed items print muted and struck through. */
  isDone?: boolean;
}>;

/** The row's title as the button that opens it, built on `@foldkit/ui`'s Button; it
 *  underlines on hover. */
export const titleView = <Message>(
  config: TitleConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: config.onOpen,
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            h.Class(config.isDone === true ? "title done-title" : "title"),
          ],
          [config.label]
        ),
    },
    h
  );
