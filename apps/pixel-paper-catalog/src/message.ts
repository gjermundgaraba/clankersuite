import {
  CommandPalette,
  CopyButton,
  KeyHelp,
  KeyHint,
  Menu,
  Scheme,
  Tips,
  TopBar,
} from "@gjermundgaraba/pixel-paper";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";
import { UrlRequest } from "foldkit/navigation";
import { Url } from "foldkit/url";

import { Copies } from "./copies.ts";
import type { CopyKey } from "./copies.ts";
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
import * as FoundationsPage from "./page/foundations.ts";
import * as Screens from "./screen/screens.ts";
import * as CommandExamples from "./section/commands.ts";

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedScrollToFragment: {},
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  TickedClock: { now: Schema.Finite },
  PressedGoKey: { url: Schema.String },
  PressedPaletteKey: {},
  PressedHelpKey: {},
  ClickedShowKeys: {},
  ClickedOpenPalette: {},
  ToggledMarkup: { sectionId: Schema.String, isOpen: Schema.Boolean },
  GotSchemeSwitchMessage: { message: Scheme.SchemeSwitch.Message },
  GotKeyHelpMessage: { message: KeyHelp.Message },
  GotPaletteMessage: { message: CommandPalette.Message },
  GotScreenMenuMessage: { message: Menu.Message },
  GotDocIndexMessage: { message: DocIndex.Message },
  GotFoundationsMessage: { message: FoundationsPage.Message },
  GotScreensMessage: { message: Screens.Message },
  GotCopyButtonMessage: { id: Copies.Key, message: CopyButton.Message },
  GotButtonsExampleMessage: { message: ButtonsExample.Message },
  GotDialogsExampleMessage: { message: DialogsExample.Message },
  GotFramesExampleMessage: { message: FramesExample.Message },
  GotFormsExampleMessage: { message: FormsExample.Message },
  GotFiltersExampleMessage: { message: FiltersExample.Message },
  GotStatesExampleMessage: { message: StatesExample.Message },
  GotHistoryExampleMessage: { message: HistoryExample.Message },
  GotListsExampleMessage: { message: ListsExample.Message },
  GotCodeExampleMessage: { message: CodeExample.Message },
  GotReadingExampleMessage: { message: ReadingExample.Message },
  GotCommandExamplesMessage: { message: CommandExamples.Message },
  GotBoardExampleMessage: { message: BoardExample.Message },
  GotSortableExampleMessage: { message: SortableExample.Message },
  GotReelExampleMessage: { message: ReelExample.Message },
  GotTabsExampleMessage: { message: TabsExample.Message },
  GotFilesExampleMessage: { message: FilesExample.Message },
  GotRailExampleMessage: { message: RailExample.Message },
  GotTipsMessage: { message: Tips.Message },
  GotTopBarMessage: { message: TopBar.Message },
});

export type Message = typeof Message.Type;

export const toCopyMessage = (
  key: CopyKey,
  message: CopyButton.Message
): Message => Message.GotCopyButtonMessage({ id: key, message });

export const toSchemeSwitchMessage = (
  message: Scheme.SchemeSwitch.Message
): Message => Message.GotSchemeSwitchMessage({ message });
