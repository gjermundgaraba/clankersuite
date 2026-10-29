import type { Clipboard } from "@effect/platform-browser";
import {
  CommandPalette,
  CopyButton,
  Deck,
  IconButton,
  KeyHelp,
  KeyHint,
  Menu,
  NavStrip,
  Scheme,
  SkipLink,
  TextButton,
  Time,
  Tips,
  TopBar,
  Wall,
  Wordmark,
} from "@gjermundgaraba/pixel-paper";
import { Array, Effect, Option, Predicate, Record, Schema } from "effect";
import type { Runtime } from "foldkit";
import { Command, Dom, Subscription, Update } from "foldkit";
import type { Document, Html, HtmlBuilder } from "foldkit/html";
import { UrlRequest, load, pushUrl } from "foldkit/navigation";
import { modifyFields } from "foldkit/struct";
import { toString as urlToString } from "foldkit/url";

import { Copies } from "./copies.ts";
import type { CopiesModel, CopyKey, CopyView } from "./copies.ts";
import { COMPONENTS, FOUNDATIONS, exportsShown } from "./covers.ts";
import * as DocIndex from "./doc-index.ts";
import * as BoardExample from "./example/board.ts";
import * as ButtonsExample from "./example/buttons.ts";
import * as CodeExample from "./example/code.ts";
import * as DialogsExample from "./example/dialogs.ts";
import * as FilesExample from "./example/files.ts";
import * as FiltersExample from "./example/filters.ts";
import * as FormsExample from "./example/forms.ts";
import * as FramesExample from "./example/frames.ts";
import * as HistoryExample from "./example/history.ts";
import * as ListsExample from "./example/lists.ts";
import * as RailExample from "./example/rail.ts";
import * as ReadingExample from "./example/reading.ts";
import * as ReelExample from "./example/reel.ts";
import * as SortableExample from "./example/sortable.ts";
import * as StatesExample from "./example/states.ts";
import * as TabsExample from "./example/tabs.ts";
import * as TipsExample from "./example/tips.ts";
import { liveRegionIn, liveRegionPlacement } from "./live-region.ts";
import { Message, toCopyMessage, toSchemeSwitchMessage } from "./message.ts";
import type { Model } from "./model.ts";
import * as ComponentsPage from "./page/components.ts";
import * as FoundationsPage from "./page/foundations.ts";
import * as NotFoundPage from "./page/not-found.ts";
import {
  AppRoute,
  componentsRouter,
  foundationsRouter,
  maybeScreenOf,
  screenUrl,
  urlToAppRoute,
} from "./route.ts";
import * as ScreenNav from "./screen-nav.ts";
import * as Screens from "./screen/screens.ts";
import { Slug } from "./screen/slugs.ts";
import * as CommandExamples from "./section/commands.ts";
import { PALETTE_KEYS } from "./site-keys.ts";
import { sampleLineView } from "./spec.ts";

const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const NavigateInternal = Command.define("NavigateInternal", {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
});

export const LoadExternal = Command.define("LoadExternal", {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
});

export const init: Runtime.RoutingApplicationInit<Model, Message> = (url) => {
  const schemeSwitchInit = Update.foldChildInit(Scheme.SchemeSwitch.init(), {
    toParentModel: (schemeSwitch): Model => ({
      route: urlToAppRoute(url),
      platform: "Other",
      maybeNow: Option.none(),
      maybeOpenedAt: Option.none(),
      schemeSwitch,
      keyHelp: KeyHelp.init({ id: "key-help" }),
      palette: CommandPalette.init({ id: "site-palette" }),
      screenMenu: Menu.init({ id: "screen-menu" }),
      docIndex: DocIndex.init(),
      foundations: FoundationsPage.init(),
      markupShown: [],
      screens: Screens.init(),
      copies: Copies.init(),
      buttons: ButtonsExample.init(),
      dialogs: DialogsExample.init(),
      frames: FramesExample.init(),
      forms: FormsExample.init(),
      filters: FiltersExample.init(),
      states: StatesExample.init(),
      history: HistoryExample.init(),
      lists: ListsExample.init(),
      code: CodeExample.init(),
      reading: ReadingExample.init(),
      commands: CommandExamples.init(),
      board: BoardExample.init(),
      sortable: SortableExample.init(),
      reel: ReelExample.init(),
      tabs: TabsExample.init(),
      files: FilesExample.init(),
      rail: RailExample.init(),
      tips: Tips.init({ id: "page-tip" }),
    }),
    toParentMessage: toSchemeSwitchMessage,
  });

  return {
    model: schemeSwitchInit.model,
    commands: [DetectKeyPlatform(), ...(schemeSwitchInit.commands ?? [])],
  };
};

type UpdateReturn = Update.Return<Model, Message, Clipboard.Clipboard>;

type UpdateStep = Update.Step<Model, Message>;

const navigateTo =
  (url: string): UpdateStep =>
  (model) => ({ model, commands: [NavigateInternal({ url })] });

const schemeSwitchFold = {
  read: (model: Model) => Option.some(model.schemeSwitch),
  write: (model: Model, nextSchemeSwitch: Scheme.SchemeSwitch.Model): Model =>
    modifyFields(model, { schemeSwitch: () => nextSchemeSwitch }),
  toParentMessage: toSchemeSwitchMessage,
};

const foldSchemeSwitch = Update.foldChild({
  update: Scheme.SchemeSwitch.update,
  ...schemeSwitchFold,
});

const foldPinScheme = (scheme: Scheme.Scheme): UpdateStep =>
  Update.foldChildStep({
    update: (schemeSwitch: Scheme.SchemeSwitch.Model) =>
      Scheme.SchemeSwitch.select(schemeSwitch, scheme),
    ...schemeSwitchFold,
  });

const foldKeyHelpOutMessage = KeyHelp.OutMessage.match<UpdateStep>({
  Closed: () => (model) => ({ model }),
});

const keyHelpFold = {
  read: (model: Model) => Option.some(model.keyHelp),
  write: (model: Model, nextKeyHelp: KeyHelp.Model): Model =>
    modifyFields(model, { keyHelp: () => nextKeyHelp }),
  toParentMessage: (message: KeyHelp.Message) =>
    Message.GotKeyHelpMessage({ message }),
  foldOutMessage: foldKeyHelpOutMessage,
};

const foldKeyHelp = Update.foldChild({
  update: KeyHelp.update,
  ...keyHelpFold,
});

const foldKeyHelpOpen = Update.foldChildStep({
  update: KeyHelp.open,
  ...keyHelpFold,
});

const foldScreenMenuOutMessage = Menu.OutMessage.match<UpdateStep>({
  Selected: () => (model) => ({ model }),
  Toggled: () => (model) => ({ model }),
});

const foldScreenMenu = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.screenMenu),
  write: (model: Model, nextScreenMenu: Menu.Model): Model =>
    modifyFields(model, { screenMenu: () => nextScreenMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotScreenMenuMessage({ message }),
  foldOutMessage: foldScreenMenuOutMessage,
});

const foldDocIndex = Update.foldChild({
  update: DocIndex.update,
  read: (model: Model) => Option.some(model.docIndex),
  write: (model: Model, nextDocIndex: DocIndex.Model): Model =>
    modifyFields(model, { docIndex: () => nextDocIndex }),
  toParentMessage: (message: DocIndex.Message) =>
    Message.GotDocIndexMessage({ message }),
});

const foldFoundations = Update.foldChild({
  update: FoundationsPage.update,
  read: (model: Model) => Option.some(model.foundations),
  write: (model: Model, nextFoundations: FoundationsPage.Model): Model =>
    modifyFields(model, { foundations: () => nextFoundations }),
  toParentMessage: (message: FoundationsPage.Message) =>
    Message.GotFoundationsMessage({ message }),
});

const foldScreens = Update.foldChild({
  update: Screens.update,
  read: (model: Model) => Option.some(model.screens),
  write: (model: Model, nextScreens: Screens.Model): Model =>
    modifyFields(model, { screens: () => nextScreens }),
  toParentMessage: (message: Screens.Message) =>
    Message.GotScreensMessage({ message }),
});

const foldCopies = Copies.fold({
  read: (model: Model) => model.copies,
  write: (model: Model, nextCopies: CopiesModel): Model =>
    modifyFields(model, { copies: () => nextCopies }),
  toParentMessage: toCopyMessage,
});

const noteCopied = (
  model: Model,
  key: CopyKey,
  message: CopyButton.Message
): Model =>
  Schema.is(CopyButton.Message.SucceededCopyText)(message)
    ? modifyFields(model, {
        screens: (screens) => Screens.noteCopied(screens, key),
      })
    : model;

const foldButtonsExample = Update.foldChild({
  update: ButtonsExample.update,
  read: (model: Model) => Option.some(model.buttons),
  write: (model: Model, nextButtons: ButtonsExample.Model): Model =>
    modifyFields(model, { buttons: () => nextButtons }),
  toParentMessage: (message) => Message.GotButtonsExampleMessage({ message }),
});

const foldDialogsExample = Update.foldChild({
  update: DialogsExample.update,
  read: (model: Model) => Option.some(model.dialogs),
  write: (model: Model, nextDialogs: DialogsExample.Model): Model =>
    modifyFields(model, { dialogs: () => nextDialogs }),
  toParentMessage: (message) => Message.GotDialogsExampleMessage({ message }),
});

const foldFramesExample = Update.foldChild({
  update: FramesExample.update,
  read: (model: Model) => Option.some(model.frames),
  write: (model: Model, nextFrames: FramesExample.Model): Model =>
    modifyFields(model, { frames: () => nextFrames }),
  toParentMessage: (message) => Message.GotFramesExampleMessage({ message }),
});

const foldFormsExample = Update.foldChild({
  update: FormsExample.update,
  read: (model: Model) => Option.some(model.forms),
  write: (model: Model, nextForms: FormsExample.Model): Model =>
    modifyFields(model, { forms: () => nextForms }),
  toParentMessage: (message) => Message.GotFormsExampleMessage({ message }),
});

const foldFiltersExample = Update.foldChild({
  update: FiltersExample.update,
  read: (model: Model) => Option.some(model.filters),
  write: (model: Model, nextFilters: FiltersExample.Model): Model =>
    modifyFields(model, { filters: () => nextFilters }),
  toParentMessage: (message) => Message.GotFiltersExampleMessage({ message }),
});

const foldStatesExample = Update.foldChild({
  update: StatesExample.update,
  read: (model: Model) => Option.some(model.states),
  write: (model: Model, nextStates: StatesExample.Model): Model =>
    modifyFields(model, { states: () => nextStates }),
  toParentMessage: (message) => Message.GotStatesExampleMessage({ message }),
});

const foldHistoryExample = Update.foldChild({
  update: HistoryExample.update,
  read: (model: Model) => Option.some(model.history),
  write: (model: Model, nextHistory: HistoryExample.Model): Model =>
    modifyFields(model, { history: () => nextHistory }),
  toParentMessage: (message) => Message.GotHistoryExampleMessage({ message }),
});

const foldListsExample = Update.foldChild({
  update: ListsExample.update,
  read: (model: Model) => Option.some(model.lists),
  write: (model: Model, nextLists: ListsExample.Model): Model =>
    modifyFields(model, { lists: () => nextLists }),
  toParentMessage: (message) => Message.GotListsExampleMessage({ message }),
});

const foldCodeExample = Update.foldChild({
  update: CodeExample.update,
  read: (model: Model) => Option.some(model.code),
  write: (model: Model, nextCode: CodeExample.Model): Model =>
    modifyFields(model, { code: () => nextCode }),
  toParentMessage: (message) => Message.GotCodeExampleMessage({ message }),
});

const foldReadingExample = Update.foldChild({
  update: ReadingExample.update,
  read: (model: Model) => Option.some(model.reading),
  write: (model: Model, nextReading: ReadingExample.Model): Model =>
    modifyFields(model, { reading: () => nextReading }),
  toParentMessage: (message) => Message.GotReadingExampleMessage({ message }),
});

const foldBoardExample = Update.foldChild({
  update: BoardExample.update,
  read: (model: Model) => Option.some(model.board),
  write: (model: Model, nextBoard: BoardExample.Model): Model =>
    modifyFields(model, { board: () => nextBoard }),
  toParentMessage: (message) => Message.GotBoardExampleMessage({ message }),
});

const foldSortableExample = Update.foldChild({
  update: SortableExample.update,
  read: (model: Model) => Option.some(model.sortable),
  write: (model: Model, nextSortable: SortableExample.Model): Model =>
    modifyFields(model, { sortable: () => nextSortable }),
  toParentMessage: (message) => Message.GotSortableExampleMessage({ message }),
});

const foldReelExample = Update.foldChild({
  update: ReelExample.update,
  read: (model: Model) => Option.some(model.reel),
  write: (model: Model, nextReel: ReelExample.Model): Model =>
    modifyFields(model, { reel: () => nextReel }),
  toParentMessage: (message) => Message.GotReelExampleMessage({ message }),
});

const foldTabsExample = Update.foldChild({
  update: TabsExample.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model: Model, nextTabs: TabsExample.Model): Model =>
    modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: (message) => Message.GotTabsExampleMessage({ message }),
});

const foldFilesExample = Update.foldChild({
  update: FilesExample.update,
  read: (model: Model) => Option.some(model.files),
  write: (model: Model, nextFiles: FilesExample.Model): Model =>
    modifyFields(model, { files: () => nextFiles }),
  toParentMessage: (message) => Message.GotFilesExampleMessage({ message }),
});

const foldRailExample = Update.foldChild({
  update: RailExample.update,
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, nextRail: RailExample.Model): Model =>
    modifyFields(model, { rail: () => nextRail }),
  toParentMessage: (message) => Message.GotRailExampleMessage({ message }),
});

const foldTips = Update.foldChild({
  update: Tips.update,
  read: (model: Model) => Option.some(model.tips),
  write: (model: Model, nextTips: Tips.Model): Model =>
    modifyFields(model, { tips: () => nextTips }),
  toParentMessage: (message) => Message.GotTipsMessage({ message }),
});

const foldCommandExamples = Update.foldChild({
  update: CommandExamples.update,
  read: (model: Model) => Option.some(model.commands),
  write: (model: Model, nextCommands: CommandExamples.Model): Model =>
    modifyFields(model, { commands: () => nextCommands }),
  toParentMessage: (message) => Message.GotCommandExamplesMessage({ message }),
});

type DocPage = Readonly<{
  router: () => string;
  label: string;
  heading: string;
  title: string;
  goKeys: readonly [string, string];
  hasClock: boolean;
  view: (model: Model, frame: DocFrame, h: HtmlBuilder<Message>) => Html;
}>;

type DocFrame = Readonly<{
  heading: string;
  siteBindings: readonly KeyHelp.Binding[];
}>;

const docPageView = (
  model: Model,
  label: string,
  entries: readonly DocIndex.Entry[],
  body: Html,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("spec-page")],
    [
      ...DocIndex.view(
        model.docIndex,
        {
          label,
          entries,
          toParentMessage: (message) => Message.GotDocIndexMessage({ message }),
        },
        h
      ),
      body,
    ]
  );

const foundationsView = (
  model: Model,
  { heading }: DocFrame,
  h: HtmlBuilder<Message>
): Html =>
  docPageView(
    model,
    heading,
    FoundationsPage.entries,
    h.submodel({
      slotId: "foundations-page",
      model: model.foundations,
      view: FoundationsPage.view,
      toParentMessage: (message) => Message.GotFoundationsMessage({ message }),
    }),
    h
  );

const copyViewIn =
  (model: Model, h: HtmlBuilder<Message>): CopyView =>
  (key, viewInputs) =>
    Copies.view(model.copies, key, viewInputs, toCopyMessage, h);

const componentsView = (
  model: Model,
  { heading, siteBindings }: DocFrame,
  h: HtmlBuilder<Message>
): Html => {
  const sections = ComponentsPage.sections(
    model,
    {
      bindings: siteBindings,
      toDialogsLiveRegionView: liveRegionIn(model, "DialogsExample", h),
      toCommandsLiveRegionView: liveRegionIn(model, "CommandExamples", h),
      toCopyView: copyViewIn(model, h),
    },
    h
  );

  return docPageView(
    model,
    heading,
    ComponentsPage.entries(sections),
    ComponentsPage.view(model, sections, h),
    h
  );
};

const DOC_PAGES = {
  Foundations: {
    router: foundationsRouter,
    label: "foundations",
    heading: "Foundations",
    title: "pixel paper",
    goKeys: ["G", "F"],
    hasClock: false,
    view: foundationsView,
  },
  Components: {
    router: componentsRouter,
    label: "components",
    heading: "Components",
    title: "Components · pixel paper",
    goKeys: ["G", "C"],
    hasClock: true,
    view: componentsView,
  },
} satisfies Record<Exclude<AppRoute["_tag"], "Screen" | "NotFound">, DocPage>;

const docPages: readonly DocPage[] = Record.values(DOC_PAGES);

export const PATHS: readonly string[] = [
  ...Array.map(docPages, ({ router }) => router()),
  ...Array.map(Slug.literals, screenUrl),
];

const maybeDocPageOf = (route: AppRoute): Option.Option<DocPage> =>
  AppRoute.matchOrElse(
    route,
    { Screen: () => Option.none(), NotFound: () => Option.none() },
    ({ _tag }) => Option.some(DOC_PAGES[_tag])
  );

const isScreenOnShow = (model: Model, screen: Slug): boolean =>
  Option.contains(maybeScreenOf(model.route), screen);

const siteBindings: readonly KeyHelp.Binding[] = [
  {
    keys: [PALETTE_KEYS],
    group: "Anywhere",
    does: "Find a component, a screen or a command",
  },
  ...Array.map(docPages, ({ goKeys, heading }) => ({
    keys: [goKeys],
    group: "Go to",
    does: heading,
  })),
];

const bindingsFor = (route: AppRoute): readonly KeyHelp.Binding[] => [
  ...siteBindings,
  ...Option.match(maybeScreenOf(route), {
    onNone: () => [],
    onSome: (screen) => Screens.catalog[screen].bindings ?? [],
  }),
];

type PaletteEntry = Readonly<{
  command: CommandPalette.Command;
  step: UpdateStep;
}>;

const exportEntry = (
  name: string,
  hint: string,
  url: string
): PaletteEntry => ({
  command: {
    id: `export-${name}`,
    group: "Components",
    label: name,
    hint,
    isAuthored: true,
    glyph: "box",
  },
  step: navigateTo(url),
});

const EXPORT_ENTRIES: readonly PaletteEntry[] = Array.dedupeWith(
  [
    ...Array.map(exportsShown(COMPONENTS), ({ name, sectionId }) =>
      exportEntry(name, sectionId, `${componentsRouter()}#${sectionId}`)
    ),
    ...Array.map(exportsShown(FOUNDATIONS), ({ name, sectionId }) =>
      exportEntry(name, "foundations", `${foundationsRouter()}#${sectionId}`)
    ),
  ],
  (left, right) => left.command.label === right.command.label
);

const schemeEntry = (
  scheme: Scheme.Scheme,
  label: string,
  hint?: string
): PaletteEntry => ({
  command: {
    id: `scheme-${scheme}`,
    group: "Palette",
    label,
    ...(hint === undefined ? {} : { hint }),
  },
  step: foldPinScheme(scheme),
});

const PAGE_ENTRIES: readonly PaletteEntry[] = [
  ...Array.map(docPages, ({ label, router }): PaletteEntry => ({
    command: { id: `go-${label}`, group: "Go to", label },
    step: navigateTo(router()),
  })),
  ...Array.map(Slug.literals, (screen): PaletteEntry => ({
    command: {
      id: `screen-${screen}`,
      group: "Screens",
      label: `${screen} screen`,
      isAuthored: true,
      glyph: "page",
    },
    step: navigateTo(screenUrl(screen)),
  })),
  schemeEntry("Paper", "paper", "light"),
  schemeEntry("Plum", "plum", "dark"),
  schemeEntry("System", "follow the system"),
];

const paletteEntries = (
  platform: KeyHint.KeyPlatform
): readonly PaletteEntry[] => [
  ...PAGE_ENTRIES,
  {
    command: {
      id: "keys",
      group: "Help",
      label: "show the keys",
      hint: KeyHint.keyLabel(KeyHelp.HELP_KEYS, platform),
    },
    step: foldKeyHelpOpen,
  },
  ...EXPORT_ENTRIES,
];

const runPaletteCommand =
  (id: string): UpdateStep =>
  (model) =>
    Option.match(
      Array.findFirst(
        paletteEntries(model.platform),
        ({ command }) => command.id === id
      ),
      {
        onNone: () => ({ model }),
        onSome: ({ step }) => step(model),
      }
    );

const foldPaletteOutMessage = CommandPalette.OutMessage.match<UpdateStep>({
  SelectedCommand: ({ id }) => runPaletteCommand(id),
  SelectedChoice: () => (model) => ({ model }),
  Closed: () => (model) => ({ model }),
});

const paletteFold = {
  read: (model: Model) => Option.some(model.palette),
  write: (model: Model, nextPalette: CommandPalette.Model): Model =>
    modifyFields(model, { palette: () => nextPalette }),
  toParentMessage: (message: CommandPalette.Message) =>
    Message.GotPaletteMessage({ message }),
  foldOutMessage: foldPaletteOutMessage,
};

const foldPalette = Update.foldChild({
  update: CommandPalette.update,
  ...paletteFold,
});

const foldPaletteOpen = Update.foldChildStep({
  update: CommandPalette.open,
  ...paletteFold,
});

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => navigateTo(urlToString(url))(model),
        External: ({ href }) => ({ model, commands: [LoadExternal({ href })] }),
      }),
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, { route: () => urlToAppRoute(url) }),
      commands: [SkipLink.ScrollToFragment({ maybeFragment: url.hash })],
    }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedScrollToFragment: () => ({ model }),
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    TickedClock: ({ now }) => ({
      model: modifyFields(model, {
        maybeNow: () => Option.some(now),
        maybeOpenedAt: Option.orElseSome(() => now),
      }),
    }),
    PressedGoKey: ({ url }) => navigateTo(url)(model),
    PressedPaletteKey: () => foldPaletteOpen(model),
    PressedHelpKey: () =>
      KeyHelp.isOpen(model.keyHelp) ? { model } : foldKeyHelpOpen(model),
    ClickedShowKeys: () => foldKeyHelpOpen(model),
    ClickedOpenPalette: () => foldPaletteOpen(model),
    ToggledMarkup: ({ sectionId, isOpen }) => ({
      model: modifyFields(model, {
        markupShown: (shown) => {
          const others = Array.filter(shown, (id) => id !== sectionId);

          return isOpen ? [...others, sectionId] : others;
        },
      }),
    }),
    GotSchemeSwitchMessage: ({ message: schemeMessage }) =>
      foldSchemeSwitch(model, schemeMessage),
    GotKeyHelpMessage: ({ message: keyHelpMessage }) =>
      foldKeyHelp(model, keyHelpMessage),
    GotPaletteMessage: ({ message: paletteMessage }) =>
      foldPalette(model, paletteMessage),
    GotScreenMenuMessage: ({ message: menuMessage }) =>
      foldScreenMenu(model, menuMessage),
    GotDocIndexMessage: ({ message: docIndexMessage }) =>
      foldDocIndex(model, docIndexMessage),
    GotFoundationsMessage: ({ message: foundationsMessage }) =>
      foldFoundations(model, foundationsMessage),
    GotScreensMessage: ({ message: screensMessage }) =>
      foldScreens(model, screensMessage),
    GotCopyButtonMessage: ({ id, message: copyMessage }) =>
      Update.combine(model, [
        (stepModel) => foldCopies(stepModel, id, copyMessage),
        (stepModel) => ({ model: noteCopied(stepModel, id, copyMessage) }),
      ]),
    GotButtonsExampleMessage: ({ message: buttonsMessage }) =>
      foldButtonsExample(model, buttonsMessage),
    GotDialogsExampleMessage: ({ message: dialogsMessage }) =>
      foldDialogsExample(model, dialogsMessage),
    GotFramesExampleMessage: ({ message: framesMessage }) =>
      foldFramesExample(model, framesMessage),
    GotFormsExampleMessage: ({ message: formsMessage }) =>
      foldFormsExample(model, formsMessage),
    GotFiltersExampleMessage: ({ message: filtersMessage }) =>
      foldFiltersExample(model, filtersMessage),
    GotStatesExampleMessage: ({ message: statesMessage }) =>
      foldStatesExample(model, statesMessage),
    GotHistoryExampleMessage: ({ message: historyMessage }) =>
      foldHistoryExample(model, historyMessage),
    GotListsExampleMessage: ({ message: listsMessage }) =>
      foldListsExample(model, listsMessage),
    GotCodeExampleMessage: ({ message: codeMessage }) =>
      foldCodeExample(model, codeMessage),
    GotReadingExampleMessage: ({ message: readingMessage }) =>
      foldReadingExample(model, readingMessage),
    GotCommandExamplesMessage: ({ message: commandsMessage }) =>
      foldCommandExamples(model, commandsMessage),
    GotBoardExampleMessage: ({ message: boardMessage }) =>
      foldBoardExample(model, boardMessage),
    GotSortableExampleMessage: ({ message: sortableMessage }) =>
      foldSortableExample(model, sortableMessage),
    GotReelExampleMessage: ({ message: reelMessage }) =>
      foldReelExample(model, reelMessage),
    GotTabsExampleMessage: ({ message: tabsMessage }) =>
      foldTabsExample(model, tabsMessage),
    GotFilesExampleMessage: ({ message: filesMessage }) =>
      foldFilesExample(model, filesMessage),
    GotRailExampleMessage: ({ message: railMessage }) =>
      foldRailExample(model, railMessage),
    GotTipsMessage: ({ message: tipsMessage }) => foldTips(model, tipsMessage),
    GotTopBarMessage: () => ({ model }),
  });

const siteKeys = Dom.streamFromKeyBindings<Message>({
  bindings: [
    ...Array.map(docPages, ({ goKeys, router }) => ({
      keys: goKeys,
      mapEvent: () => Message.PressedGoKey({ url: router() }),
    })),
    {
      keys: PALETTE_KEYS,
      whileTyping: "Allow",
      mapEvent: () => Message.PressedPaletteKey(),
    },
    ...Array.fromOption(
      Option.map(
        Option.liftPredicate(KeyHelp.HELP_KEYS, Predicate.isString),
        (keys) => ({ keys, mapEvent: () => Message.PressedHelpKey() })
      )
    ),
  ],
});

const hasClock = (route: AppRoute): boolean =>
  Option.exists(maybeDocPageOf(route), (page) => page.hasClock) ||
  Option.exists(
    maybeScreenOf(route),
    (screen) => Screens.catalog[screen].hasClock === true
  );

const hasDocIndex = (route: AppRoute): boolean =>
  Option.isSome(maybeDocPageOf(route));

const siteSubscriptions = Subscription.make<Model, Message>()(() => ({
  clock: Time.clockEntry({
    isActive: (model: Model) => hasClock(model.route),
    toMessage: (now) => Message.TickedClock({ now }),
  }),
  siteKeys: Subscription.persistentEntry(siteKeys),
}));

const docIndexSubscriptions = DocIndex.subscriptionsFor<Model, Message>({
  isActive: (model) => hasDocIndex(model.route),
  page: (model) => model.route._tag,
  toMessage: (message) => Message.GotDocIndexMessage({ message }),
});

const schemeSwitchSubscriptions = Subscription.lift(
  Scheme.SchemeSwitch.subscriptions
)<Model, Message>({
  read: (model) => Option.some(model.schemeSwitch),
  toParentMessage: toSchemeSwitchMessage,
});

const readingExampleSubscriptions = Subscription.lift(
  ReadingExample.subscriptions
)<Model, Message>({
  read: (model) => Option.some(model.reading),
  toParentMessage: (message) => Message.GotReadingExampleMessage({ message }),
});

const boardExampleSubscriptions = Subscription.lift(BoardExample.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.board),
  toParentMessage: (message) => Message.GotBoardExampleMessage({ message }),
});

const sortableExampleSubscriptions = Subscription.lift(
  SortableExample.subscriptions
)<Model, Message>({
  read: (model) => Option.some(model.sortable),
  toParentMessage: (message) => Message.GotSortableExampleMessage({ message }),
});

const reelExampleSubscriptions = Subscription.lift(ReelExample.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.reel),
  toParentMessage: (message) => Message.GotReelExampleMessage({ message }),
});

const railExampleSubscriptions = Subscription.lift(RailExample.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.rail),
  toParentMessage: (message) => Message.GotRailExampleMessage({ message }),
});

const tipsSubscriptions = Subscription.lift(Tips.subscriptions("tip"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.tips),
  toParentMessage: (message) => Message.GotTipsMessage({ message }),
});

const screensSubscriptions = Screens.subscriptionsFor<Model, Message>({
  read: (model) => model.screens,
  toParentMessage: (message: Screens.Message) =>
    Message.GotScreensMessage({ message }),
  isOnShow: isScreenOnShow,
});

export const subscriptions = Subscription.aggregate(
  siteSubscriptions,
  docIndexSubscriptions,
  schemeSwitchSubscriptions,
  readingExampleSubscriptions,
  boardExampleSubscriptions,
  sortableExampleSubscriptions,
  reelExampleSubscriptions,
  railExampleSubscriptions,
  tipsSubscriptions,
  screensSubscriptions
);

const schemeSwitchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "scheme-switch",
    model: model.schemeSwitch,
    view: Scheme.SchemeSwitch.view,
    toParentMessage: toSchemeSwitchMessage,
  });

const topBarView = (model: Model, h: HtmlBuilder<Message>): Html =>
  TopBar.view(
    {
      brand: [
        Wordmark.view({ label: "pixel paper", href: foundationsRouter() }, h),
      ],
      nav: [
        NavStrip.view(
          {
            label: "Specimen",
            items: [
              ...Array.map(
                Record.toEntries(DOC_PAGES),
                ([tag, { label, router }]) => ({
                  href: router(),
                  label,
                  isCurrent: model.route._tag === tag,
                })
              ),
              {
                href: screenUrl(Slug.literals[0]),
                label: "screens",
                isCurrent: Option.isSome(maybeScreenOf(model.route)),
              },
            ],
          },
          h
        ),
      ],
      tools: [
        h.span(
          [h.Class("spec-wide-tools")],
          [
            TextButton.view(
              { label: "commands", onClick: Message.ClickedOpenPalette() },
              h
            ),
            TextButton.view(
              { label: "keys", onClick: Message.ClickedShowKeys() },
              h
            ),
          ]
        ),
        h.span(
          [h.Class("spec-commands-glyph")],
          [
            IconButton.view(
              {
                glyph: "search",
                label: "Commands",
                onClick: Message.ClickedOpenPalette(),
              },
              h
            ),
          ]
        ),
        schemeSwitchView(model, h),
      ],
      toParentMessage: (message) => Message.GotTopBarMessage({ message }),
    },
    h
  );

const headingView = (heading: string, h: HtmlBuilder<Message>): Html =>
  h.h1([h.Class("sr-only")], [heading]);

const deckView = (
  model: Model,
  body: readonly Html[],
  h: HtmlBuilder<Message>
) => [SkipLink.view(h), topBarView(model, h), Deck.view({ body }, h)];

const screenHeadingView = (
  screen: Slug,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { title, hasOwnHeading } = Screens.catalog[screen];

  return hasOwnHeading === true ? [] : [headingView(`${title} screen`, h)];
};

const screenNavConfig = (
  model: Model,
  screen: Slug
): ScreenNav.ViewConfig<Message> => ({
  menu: model.screenMenu,
  current: screen,
  toParentMessage: (message) => Message.GotScreenMenuMessage({ message }),
});

const screenView = (
  model: Model,
  screen: Slug,
  h: HtmlBuilder<Message>
): Html =>
  Screens.view(
    model.screens,
    screen,
    {
      platform: model.platform,
      maybeNow: model.maybeNow,
      toLiveRegionView: liveRegionIn(model, "Screen", h),
      toScreenNavView: () => ScreenNav.view(screenNavConfig(model, screen), h),
      toScreenMenuView: () =>
        ScreenNav.menuView(screenNavConfig(model, screen), h),
      toCopyView: copyViewIn(model, h),
    },
    {
      toParentMessage: (message: Screens.Message) =>
        Message.GotScreensMessage({ message }),
    },
    h
  );

type ScreenFrame = (
  model: Model,
  screen: Slug,
  h: HtmlBuilder<Message>
) => readonly Html[];

const deckScreenView: ScreenFrame = (model, screen, h) =>
  deckView(
    model,
    [
      ...screenHeadingView(screen, h),
      ScreenNav.view(screenNavConfig(model, screen), h),
      screenView(model, screen, h),
      sampleLineView(h),
    ],
    h
  );

const bareScreenView: ScreenFrame = (model, screen, h) => [
  SkipLink.view(h),
  topBarView(model, h),
  ...screenHeadingView(screen, h),
  screenView(model, screen, h),
  sampleLineView(h),
];

const wallScreenView: ScreenFrame = (model, screen, h) => [
  SkipLink.view(h),
  h.aside(
    [h.AriaLabel("Specimen"), h.Class("spec-wall-corner")],
    [
      ScreenNav.menuView(screenNavConfig(model, screen), h),
      IconButton.view(
        {
          glyph: "search",
          label: "Commands",
          onClick: Message.ClickedOpenPalette(),
        },
        h
      ),
      schemeSwitchView(model, h),
    ]
  ),
  Wall.view(
    { body: [...screenHeadingView(screen, h), screenView(model, screen, h)] },
    h
  ),
  sampleLineView(h),
];

const SCREEN_FRAMES: Readonly<Record<Screens.Layout, ScreenFrame>> = {
  Deck: deckScreenView,
  Bare: bareScreenView,
  Wall: wallScreenView,
};

const docFrameView = (model: Model, page: DocPage, h: HtmlBuilder<Message>) =>
  deckView(
    model,
    [
      headingView(page.heading, h),
      page.view(model, { heading: page.heading, siteBindings }, h),
    ],
    h
  );

const NOT_FOUND_HEADING = "Not found";

const pageOf = (
  model: Model,
  h: HtmlBuilder<Message>
): Readonly<{ title: string; frame: readonly Html[] }> =>
  AppRoute.matchOrElse(
    model.route,
    {
      Screen: ({ screen }) => {
        const { title, layout } = Screens.catalog[screen];

        return {
          title: `${title} screen · pixel paper`,
          frame: SCREEN_FRAMES[layout](model, screen, h),
        };
      },
      NotFound: () => ({
        title: `${NOT_FOUND_HEADING} · pixel paper`,
        frame: deckView(
          model,
          [headingView(NOT_FOUND_HEADING, h), NotFoundPage.view(h)],
          h
        ),
      }),
    },
    ({ _tag }) => ({
      title: DOC_PAGES[_tag].title,
      frame: docFrameView(model, DOC_PAGES[_tag], h),
    })
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const page = pageOf(model, h);

  return {
    title: page.title,
    body: h.div(
      [],
      [
        ...page.frame,
        h.submodel({
          slotId: CommandPalette.id(model.palette),
          model: model.palette,
          view: CommandPalette.view,
          viewInputs: {
            commands: Array.map(
              paletteEntries(model.platform),
              ({ command }) => command
            ),
            noun: "component",
            toLiveRegionView: liveRegionIn(model, "Palette", h),
          },
          toParentMessage: (message) => Message.GotPaletteMessage({ message }),
        }),
        h.submodel({
          slotId: KeyHelp.id(model.keyHelp),
          model: model.keyHelp,
          view: KeyHelp.view,
          viewInputs: {
            bindings: bindingsFor(model.route),
            platform: model.platform,
            toLiveRegionView: liveRegionIn(model, "KeyHelp", h),
          },
          toParentMessage: (message) => Message.GotKeyHelpMessage({ message }),
        }),
        TipsExample.layerView(
          model.tips,
          (message) => Message.GotTipsMessage({ message }),
          h
        ),
        ...liveRegionPlacement(model, h).toPageView(),
      ]
    ),
  };
};
