import { Button as UiButton, Checkbox as UiCheckbox } from "@foldkit/ui";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import { countParts } from "../count/count.ts";
import * as Marker from "../marker/marker.ts";
import { slotView } from "../slot/slot.ts";

export type ViewConfig = Readonly<{
  /** Each made with `rowView`. */
  rows: readonly Html[];
  /** An outline: nested rows indent 28px, and a row's fold hangs outside its left edge. */
  isOutline?: boolean;
  /** Names the list for screen readers; a treegrid needs it. */
  label?: string;
  /** A keyboard-driven list, whose cursor the application moves: a
   *  `role="treegrid"`, so a screen reader hands it the arrow and letter keys. Give every row
   *  its `treegrid` place. */
  isTreegrid?: boolean;
  /** Rows that wait behind the one being worked on, such as an inbox's up next: their titles
   *  in secondary text. */
  isDimmed?: boolean;
  /** A short list beside other details, such as a side pane's subtasks: rows a control's
   *  height, with a smaller check. */
  isCompact?: boolean;
}>;

/** A list of rows. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.ul(
    [
      ...(config.isTreegrid === true ? [h.Role("treegrid")] : []),
      ...(config.label === undefined ? [] : [h.AriaLabel(config.label)]),
      h.Class(
        `gg-rows${config.isOutline === true ? " gg-tree" : ""}${config.isDimmed === true ? " gg-dimmed" : ""}${config.isCompact === true ? " gg-compact" : ""}`
      ),
    ],
    config.rows
  );

export type SectionConfig = Readonly<{
  /** Unique in the document: the heading's id is made from it, and it keys the group. */
  id: string;
  /** The group's heading, an `h2` that names it. A list's first group, the page's own rows,
   *  goes without. */
  title?: string;
  /** A 14px glyph before the title: a moon for this evening. */
  glyph?: GlyphName;
  /** An area's square before the title, in its colour. */
  marker?: Marker.Colour;
  /** How many rows the group holds, quiet after the title. Screen readers hear it after a
   *  pause: "Work, 6". */
  count?: number;
  /** A `view` of rows, then an `addView`. */
  body: ReadonlyArray<Html | string>;
}>;

const sectionTitleId = (id: string): string => `${id}-title`;

/** A group of rows under a plain heading, with no box and no rule: the heading names the group
 *  (a `section` labelled by its `h2`), and groups stand apart by space alone. */
export const sectionView = <Message>(
  config: SectionConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, title, glyph, marker, count, body } = config;

  if (title === undefined) {
    return h.keyed("div")(id, [h.Class("gg-rows-section")], body);
  }

  const counted = countParts(title, count, h);

  return h.keyed("section")(
    id,
    [h.AriaLabelledBy(sectionTitleId(id)), h.Class("gg-rows-section")],
    [
      h.h2(
        [h.Id(sectionTitleId(id)), ...counted.name, h.Class("gg-rows-head")],
        [
          ...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]),
          ...(marker === undefined ? [] : [Marker.view({ colour: marker }, h)]),
          title,
          ...counted.view,
        ]
      ),
      ...body,
    ]
  );
};

/** A selectable row's checkbox, held in the caller's Model. Its row is tinted while checked;
 *  the row's text is its label, so a click anywhere on the text toggles it. */
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

export type RowConfig<Message> = Readonly<{
  /** The row's stable id among its siblings. */
  key: string;
  /** The 18px slot at the left: a `checkView`, a `glyphView`, or a status as a
   *  `Chip.dotView`. */
  glyph?: Html;
  /** A `toggleView` that folds the rows under this one, hung outside the row's left edge. */
  fold?: Html;
  /** The row's text, a title and a `contextView` under it; it takes the free width and
   *  ellipsises. */
  body: ReadonlyArray<Html | string>;
  /** Right-aligned chips, marks, counts, due days: only what matters. Where the pointer can
   *  hover, the tools take its place while the row is hovered or holds focus. */
  slot?: ReadonlyArray<Html | string>;
  /** Further attributes for the slot's span, such as an id the row's line is described
   *  by (`aria-describedby`); there is no span, and so nothing to point at, while `slot` is
   *  empty. Never a class. */
  slotAttributes?: Attributes<Message>;
  /** Controls that belong to the row's job, before the tools (an approve and reject pair). */
  actions?: ReadonlyArray<Html | string>;
  /** Quiet IconButtons at the row's right end. Where the pointer can hover, they show in the
   *  slot's place while the row is hovered, holds focus or is the cursor row, and stay in the
   *  keyboard's order while unseen, so Tab shows them; elsewhere they always show. Hidden on a
   *  phone. */
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
   *  `aria-current` tints the row. For a list no keyboard drives: a treegrid's row (with
   *  `treegrid`) is already its own stop, and ignores it. */
  isLink?: boolean;
  /** Makes the row selectable: a box at its left edge. */
  select?: RowSelect<Message>;
  /** The row's place in a treegrid; every row of a treegrid has one. */
  treegrid?: TreegridPlace;
  /** Further attributes for the row's line, not its `li`: a keyboard list's
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
        `gg-row${config.isContext === true ? " gg-context" : ""}${
          config.isLink === true && config.treegrid === undefined
            ? " gg-linked"
            : ""
        }`
      ),
    ],
    [
      ...cellView(
        config,
        "gg-cell gg-fold",
        config.fold === undefined ? [] : [config.fold],
        h
      ),
      ...box,
      ...cellView(
        config,
        "gg-cell",
        config.glyph === undefined ? [] : [config.glyph],
        h
      ),
      text,
      ...slotView("span", "gg-slot", config.slot ?? [], h, [
        ...(config.slotAttributes ?? []),
        ...cellRole(config, h),
      ]),
      ...cellView(config, "gg-cell", config.actions ?? [], h),
      ...slotView(
        "span",
        "gg-tools",
        config.tools ?? [],
        h,
        cellRole(config, h)
      ),
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
              [...cellRole(config, h), h.Class("gg-row-check")],
              [h.button(groups.checkbox)]
            ),
          ],
          config.treegrid === undefined
            ? h.label([...groups.label, h.Class("gg-grow")], textOf(config, h))
            : h.span(
                [...cellRole(config, h), h.Class("gg-cell gg-grow-cell")],
                [
                  h.label(
                    [...groups.label, h.Class("gg-grow")],
                    textOf(config, h)
                  ),
                ]
              ),
          h
        ),
    },
    h
  );

/** One row: its fold, box, glyph, text, slot, actions, tools, and the rows nested under it.
 *  Hover and focus tint it. The box of a selectable row is built on `@foldkit/ui`'s Checkbox:
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
          h.div(
            [...cellRole(config, h), h.Class("gg-grow")],
            textOf(config, h)
          ),
          h
        )
      : selectableLineView(config, config.select, h),
    ...slotView("ul", "gg-rows", config.nested ?? [], h, listRole),
  ]);
};

export type GlyphConfig = Readonly<{
  name: GlyphName;
}>;

/** A glyph in the row's 18px slot. */
export const glyphView = <Message>(
  config: GlyphConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.span([h.Class("gg-glyph")], [Glyph.view({ name: config.name }, h)]);

export type ToggleConfig<Message> = Readonly<{
  isExpanded: boolean;
  /** What the nested rows hang under: the toggle is named `"Rows under Notes"` whether open
   *  or not, and `aria-expanded` says which. */
  label: string;
  onToggle: Message;
}>;

/** A row's fold, for its `fold`, built on `@foldkit/ui`'s Button: a chevron, down while the
 *  rows under it show and turned right while they are folded away, `aria-expanded`, named for
 *  the rows it shows. */
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
            h.Class("gg-fold"),
          ],
          [Glyph.view({ name: "caret-down" }, h)]
        ),
    },
    h
  );

export type CheckConfig<Message> = Readonly<{
  /** Unique in the document: the id of the check's name is made from it. */
  id: string;
  /** What is checked off, the row's title: the check's name. */
  label: string;
  isDone: boolean;
  /** The check's next state. */
  onToggle: (isDone: boolean) => Message;
}>;

/** A round check for the row's glyph slot, built on `@foldkit/ui`'s Checkbox: a
 *  `role="checkbox"` button named by `label`, `aria-checked` while done, that fills with the
 *  accent and pops as it is checked. */
export const checkView = <Message>(
  config: CheckConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiCheckbox.view(
    {
      id: config.id,
      isChecked: config.isDone,
      onToggle: config.onToggle,
      toView: (groups) =>
        h.span(
          [h.Class("gg-check-cell")],
          [
            h.button(
              [...groups.checkbox, h.Class("gg-check")],
              [Glyph.view({ name: "check" }, h)]
            ),
            h.span([...groups.label, h.Class("sr-only")], [config.label]),
          ]
        ),
    },
    h
  );

/** An area or a goal in a row's context line: its name and its Marker's colour. */
export type ContextMark = Readonly<{ label: string; colour: Marker.Colour }>;

export type ContextConfig = Readonly<{
  /** The row's area, after its square. */
  area?: ContextMark;
  /** The task the row sits under, after a `›`. */
  parent?: string;
  /** The goals the row serves, each after a `·` and its dot. */
  goals?: readonly ContextMark[];
}>;

const separatorView = <Message>(mark: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.AriaHidden(true), h.Class("gg-sep")], [mark]);

/** Where the row belongs, in a quiet line under its title: its area, the task it sits under,
 *  and the goals it serves. The separators are for the eye only. */
export const contextView = <Message>(
  config: ContextConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { area, parent, goals = [] } = config;

  return h.span(
    [h.Class("gg-row-context")],
    [
      ...(area === undefined
        ? []
        : [h.span([], [Marker.view({ colour: area.colour }, h), area.label])]),
      ...(parent === undefined
        ? []
        : [
            ...(area === undefined ? [] : [separatorView("›", h)]),
            h.span([], [parent]),
          ]),
      ...goals.flatMap((goal, index) => [
        ...(area === undefined && parent === undefined && index === 0
          ? []
          : [separatorView("·", h)]),
        h.span(
          [],
          [Marker.view({ colour: goal.colour, kind: "Goal" }, h), goal.label]
        ),
      ]),
    ]
  );
};

export type AddConfig<Message> = Readonly<{
  /** What it adds to: `"Add to Focus"`. */
  label: string;
  onAdd: Message;
  /** The button's id, unique in the document, so focus can come back to it: the application
   *  swaps the button for an InlineInput while it adds, and once that ends puts focus here. */
  id?: string;
}>;

/** A quiet button after a list's rows, as tall as a row, that adds one: a plus and its
 *  words. Built on `@foldkit/ui`'s Button. */
export const addView = <Message>(
  config: AddConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: config.onAdd,
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            ...(config.id === undefined ? [] : [h.Id(config.id)]),
            h.Class("gg-add-row"),
          ],
          [Glyph.view({ name: "plus" }, h), config.label]
        ),
    },
    h
  );

/** What was finished, in a quiet line under a list: `"1 done today · Answer Lars"`, after a
 *  check. */
export const doneView = <Message>(
  body: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): Html =>
  h.p([h.Class("gg-done-line")], [Glyph.view({ name: "check" }, h), ...body]);

export type TitleConfig<Message> = Readonly<{
  label: string;
  onOpen: Message;
  /** Closed items print muted and struck through, and screen readers hear "(done)" after
   *  the title. */
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
            h.Class(
              config.isDone === true ? "gg-title gg-done-title" : "gg-title"
            ),
          ],
          config.isDone === true
            ? [config.label, h.span([h.Class("sr-only")], [" (done)"])]
            : [config.label]
        ),
    },
    h
  );
