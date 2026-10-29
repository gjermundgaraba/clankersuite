import { CodeSurface, Disclosure } from "@gjermundgaraba/pixel-paper";
import type { KeyHelp } from "@gjermundgaraba/pixel-paper";
import { Array, Record } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { CopyView } from "../copies.ts";
import { COMPONENTS } from "../covers.ts";
import type * as DocIndex from "../doc-index.ts";
import * as BoardExample from "../example/board.ts";
import * as ButtonsExample from "../example/buttons.ts";
import * as CodeExample from "../example/code.ts";
import * as DialogsExample from "../example/dialogs.ts";
import * as FilesExample from "../example/files.ts";
import * as FiltersExample from "../example/filters.ts";
import * as FormsExample from "../example/forms.ts";
import * as FramesExample from "../example/frames.ts";
import * as HistoryExample from "../example/history.ts";
import * as IdentityExample from "../example/identity.ts";
import * as KeysExample from "../example/keys.ts";
import * as LayoutExample from "../example/layout.ts";
import * as ListsExample from "../example/lists.ts";
import * as MetersExample from "../example/meters.ts";
import * as RailExample from "../example/rail.ts";
import * as ReadingExample from "../example/reading.ts";
import * as ReelExample from "../example/reel.ts";
import * as SchemeExample from "../example/scheme.ts";
import * as SortableExample from "../example/sortable.ts";
import * as StatesExample from "../example/states.ts";
import * as TablesExample from "../example/tables.ts";
import * as TabsExample from "../example/tabs.ts";
import * as TimeExample from "../example/time.ts";
import * as TipsExample from "../example/tips.ts";
import { Message, toSchemeSwitchMessage } from "../message.ts";
import type { Model } from "../model.ts";
import * as CommandExamples from "../section/commands.ts";
import { sourceOf } from "../section/sources.ts";
import { markupOf } from "../shown.ts";
import { sampleLineView, sectionView, sourceView } from "../spec.ts";
import type { SectionConfig } from "../spec.ts";

type SectionId = keyof typeof COMPONENTS;

type SectionContent = Readonly<{
  title: string;
  about: string;
  file: string;
  body: () => Html;
}>;

export type SectionsById = Readonly<Partial<Record<SectionId, SectionContent>>>;

type ComponentSection = SectionContent & Readonly<{ id: SectionId }>;

type PageInputs = Readonly<{
  bindings: readonly KeyHelp.Binding[];
  toDialogsLiveRegionView: (() => Html) | undefined;
  toCommandsLiveRegionView: (() => Html) | undefined;
  toCopyView: CopyView;
}>;

export const sections = (
  model: Model,
  inputs: PageInputs,
  h: HtmlBuilder<Message>
): readonly ComponentSection[] => {
  const byId: Readonly<Record<SectionId, SectionContent>> = {
    buttons: {
      title: "Buttons",
      file: "buttons.ts",
      about:
        "A busy button prints the working cursor in its padding, so it keeps its width. Danger fills red only inside the confirm that commits it.",
      body: () =>
        h.submodel({
          slotId: "buttons-example",
          model: model.buttons,
          view: ButtonsExample.view,
          viewInputs: { platform: model.platform },
          toParentMessage: (message) =>
            Message.GotButtonsExampleMessage({ message }),
        }),
    },
    dialogs: {
      title: "Cards and dialogs",
      file: "dialogs.ts",
      about:
        "A dialog on the ink veil holds one Card. Escape or a click on the veil closes it, and focus returns where it was. The confirm stays open while its work runs and closes when the work lands.",
      body: () =>
        h.submodel({
          slotId: "dialogs-example",
          model: model.dialogs,
          view: DialogsExample.view,
          viewInputs: { toLiveRegionView: inputs.toDialogsLiveRegionView },
          toParentMessage: (message) =>
            Message.GotDialogsExampleMessage({ message }),
        }),
    },
    frames: {
      title: "Frames",
      file: "frames.ts",
      about:
        "The bars, tools and places an interface is framed by. This page's own top bar and skip link are the components, and its body is a Deck, the main landmark the skip link moves to; a Bench, a Stage and a Wall are main landmarks too, so they are whole screens (the Workspace, the Stage, the walls), not specimens.",
      body: () =>
        h.submodel({
          slotId: "frames-example",
          model: model.frames,
          view: FramesExample.view,
          viewInputs: { platform: model.platform },
          toParentMessage: (message) =>
            Message.GotFramesExampleMessage({ message }),
        }),
    },
    layout: {
      title: "Panels and layout",
      file: "layout.ts",
      about:
        "A screen's head, its panels, and the space between things. Stack, Group and Wrap are space only: no paper, border or shadow.",
      body: () => LayoutExample.view(h),
    },
    forms: {
      title: "Forms",
      file: "forms.ts",
      about:
        "Save the form empty: the summary takes focus and links to each failed field, which wears red. While it saves, every control is held at once.",
      body: () =>
        h.submodel({
          slotId: "forms-example",
          model: model.forms,
          view: FormsExample.view,
          toParentMessage: (message) =>
            Message.GotFormsExampleMessage({ message }),
        }),
    },
    filters: {
      title: "Filters and chips",
      file: "filters.ts",
      about:
        "Filters over a list print as chips, pressed when in force. Colour in a chip only repeats its word: active, a warning, or blocked.",
      body: () =>
        h.submodel({
          slotId: "filters-example",
          model: model.filters,
          view: FiltersExample.view,
          toParentMessage: (message) =>
            Message.GotFiltersExampleMessage({ message }),
        }),
    },
    time: {
      title: "Time",
      file: "time.ts",
      about:
        "A moment said relative to the page's one clock, or as a date. Before the clock first ticks, as in the built HTML, it prints the moment in UTC so the server and the browser agree.",
      body: () => TimeExample.view(model.maybeNow, model.maybeOpenedAt, h),
    },
    keys: {
      title: "Keys",
      file: "keys.ts",
      about:
        "The keys this page answers to, described once and listed by the key help.",
      body: () =>
        KeysExample.view(
          inputs.bindings,
          model.platform,
          Message.ClickedShowKeys(),
          h
        ),
    },
    scheme: {
      title: "Palette",
      file: "scheme.ts",
      about:
        "The reader's choice of palette, pinned on <html data-scheme> and remembered on this device. The switch is a Segmented, and shows one Model with the one in the top bar.",
      body: () =>
        SchemeExample.view(model.schemeSwitch, toSchemeSwitchMessage, h),
    },
    states: {
      title: "Empty, loading and flash",
      file: "states.ts",
      about:
        "What a panel says with nothing to show and while its content is on the way, and the word printed beside a control that just worked. The word and its clearing live in the Model.",
      body: () =>
        h.submodel({
          slotId: "states-example",
          model: model.states,
          view: StatesExample.view,
          toParentMessage: (message) =>
            Message.GotStatesExampleMessage({ message }),
        }),
    },
    history: {
      title: "History",
      file: "history.ts",
      about:
        "A ruled log, newest first: a version log with the version in force, and an activity log that wraps its entries and pages to older ones, ending on an empty state.",
      body: () =>
        h.submodel({
          slotId: "history-example",
          model: model.history,
          view: HistoryExample.view,
          viewInputs: { maybeNow: model.maybeNow },
          toParentMessage: (message) =>
            Message.GotHistoryExampleMessage({ message }),
        }),
    },
    tables: {
      title: "Tables and properties",
      file: "tables.ts",
      about:
        "A ruled table with column heads and row tools, read on a phone as labelled lines, and a list of a thing's properties.",
      body: () => TablesExample.view(h),
    },
    lists: {
      title: "Rows and selection",
      file: "lists.ts",
      about:
        "Rows of 34px with a glyph, a title, a slot and tools. A selectable list keeps its selection in the Model.",
      body: () =>
        h.submodel({
          slotId: "lists-example",
          model: model.lists,
          view: ListsExample.view,
          toParentMessage: (message) =>
            Message.GotListsExampleMessage({ message }),
        }),
    },
    identity: {
      title: "Identity",
      file: "identity.ts",
      about:
        "Who or what something is, in letters in an ink square or a mark the product draws in cells.",
      body: () => IdentityExample.view(h),
    },
    meters: {
      title: "Meters and stats",
      file: "meters.ts",
      about:
        "Readings against a maximum as twenty cells, amber from 80% and a red chip at the maximum, and figures in ruled cells.",
      body: () => MetersExample.view(h),
    },
    code: {
      title: "Code and diffs",
      file: "code.ts",
      about: "Code to read, code to edit, and a patch from git as a line diff.",
      body: () =>
        h.submodel({
          slotId: "code-example",
          model: model.code,
          view: CodeExample.view,
          toParentMessage: (message) =>
            Message.GotCodeExampleMessage({ message }),
        }),
    },
    reading: {
      title: "Reading",
      file: "reading.ts",
      about:
        "An authored page slows to reading pace, held to the reading measure. Its contents mark the heading being read as the page scrolls.",
      body: () =>
        h.submodel({
          slotId: "reading-example",
          model: model.reading,
          view: ReadingExample.view,
          toParentMessage: (message) =>
            Message.GotReadingExampleMessage({ message }),
        }),
    },
    board: {
      title: "Board",
      file: "board.ts",
      about:
        "Columns of printed slips. A mouse drags a slip; touch and the keyboard take its grip: space picks the card up, each arrow jumps it a column, space drops it and escape puts it back, and every step is said through the live region. The data is the page's: a drop reports Moved and the page moves the item.",
      body: () =>
        h.submodel({
          slotId: "board-example",
          model: model.board,
          view: BoardExample.view,
          toParentMessage: (message) =>
            Message.GotBoardExampleMessage({ message }),
        }),
    },
    sortable: {
      title: "Sortable",
      file: "sortable.ts",
      about:
        "Items the reader puts in order, as rows or tiles. A mouse drags an item; touch and the keyboard take its grip, so a finger on a row still scrolls: space picks the item up, each arrow moves it one place, space drops it and escape puts it back, and every step is said through the live region. The data is the page's: a drop reports Moved and the page moves the item.",
      body: () =>
        h.submodel({
          slotId: "sortable-example",
          model: model.sortable,
          view: SortableExample.view,
          toParentMessage: (message) =>
            Message.GotSortableExampleMessage({ message }),
        }),
    },
    reel: {
      title: "Reel",
      file: "reel.ts",
      about:
        "A row of columns of panes, scrolled sideways when it is wider than its frame and down where a column is taller, for a workspace of windows side by side. A pane's grip moves it by pointer or keyboard, into another column or a column of its own; its splitters size a column or the panes in it, and the page's keys focus and move panes and columns. The layout is the page's, addressed by id: a move reports what it asks of the layout, and the page applies it, here to one layout three reels show. The third prints its panes as tabs, one at a time at its full size, with no grips or splitters.",
      body: () =>
        h.submodel({
          slotId: "reel-example",
          model: model.reel,
          view: ReelExample.view,
          toParentMessage: (message) =>
            Message.GotReelExampleMessage({ message }),
        }),
    },
    tabs: {
      title: "Tabs and disclosures",
      file: "tabs.ts",
      about:
        "Tabs pick one panel of several and keep which in the page's Model; a disclosure opens what hangs under its line, which stays on the page while shut.",
      body: () =>
        h.submodel({
          slotId: "tabs-example",
          model: model.tabs,
          view: TabsExample.view,
          toParentMessage: (message) =>
            Message.GotTabsExampleMessage({ message }),
        }),
    },
    files: {
      title: "Files and copying",
      file: "files.ts",
      about:
        "A copy button writes through Effect's Clipboard port, which the application provides, and says it copied.",
      body: () =>
        h.submodel({
          slotId: "files-example",
          model: model.files,
          view: FilesExample.view,
          viewInputs: { toCopyView: inputs.toCopyView },
          toParentMessage: (message) =>
            Message.GotFilesExampleMessage({ message }),
        }),
    },
    rail: {
      title: "Rail",
      file: "rail.ts",
      about:
        "A column of panels beside the deck, here held in a frame. Its top stays put while its last panel's list scrolls, and the toggle in its first panel's bar folds it to that bar, stood on end. At 900px and under it leaves the page and its button opens the same element as a drawer; Escape, a press on the veil or focus leaving closes it.",
      body: () =>
        h.submodel({
          slotId: "rail-example",
          model: model.rail,
          view: RailExample.view,
          toParentMessage: (message) =>
            Message.GotRailExampleMessage({ message }),
        }),
    },
    tips: {
      title: "Tips",
      file: "tips.ts",
      about:
        "One tip for the page shows the words of any control carrying data-tip, its accessible name, and stays out of the accessibility tree. Escape closes the tip and nothing else.",
      body: () => TipsExample.view(h),
    },
    ...CommandExamples.sections(
      model.commands,
      model.platform,
      inputs.toCommandsLiveRegionView,
      (message) => Message.GotCommandExamplesMessage({ message }),
      h
    ),
  };

  return Array.map(Record.keys(COMPONENTS), (id) => ({ id, ...byId[id] }));
};

export const entries = (
  pageSections: readonly ComponentSection[]
): readonly DocIndex.Entry[] =>
  Array.map(pageSections, ({ id, title }) => ({ id, title }));

const markupView = (
  section: ComponentSection,
  body: Html,
  markupShown: readonly string[],
  h: HtmlBuilder<Message>
): Html => {
  const isOpen = Array.contains(markupShown, section.id);

  return Disclosure.view(
    {
      id: `${section.id}-markup`,
      label: "markup",
      isOpen,
      onToggle: (isNextOpen) =>
        Message.ToggledMarkup({ sectionId: section.id, isOpen: isNextOpen }),
      body: isOpen
        ? [
            CodeSurface.view(
              { label: `${section.title}, the markup`, body: [markupOf(body)] },
              h
            ),
          ]
        : [],
    },
    h
  );
};

const toSectionConfig = (
  section: ComponentSection,
  markupShown: readonly string[],
  h: HtmlBuilder<Message>
): SectionConfig => {
  const body = section.body();

  return {
    id: section.id,
    title: section.title,
    about: section.about,
    covers: COMPONENTS[section.id],
    body: [body],
    foot: [
      sourceView(section.file, sourceOf(section.file), h),
      markupView(section, body, markupShown, h),
    ],
  };
};

export const view = (
  model: Model,
  pageSections: readonly ComponentSection[],
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-stack")],
    [
      sampleLineView(h),
      ...Array.map(pageSections, (section) =>
        sectionView(toSectionConfig(section, model.markupShown, h), h)
      ),
    ]
  );
