import {
  CommandPalette,
  KeyHelp,
  KeyHint,
  Menu,
  Scheme,
  Tips,
} from "@gjermundgaraba/pixel-paper";
import { Schema } from "effect";

import { Copies } from "./copies.ts";
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
import { AppRoute } from "./route.ts";
import * as Screens from "./screen/screens.ts";
import * as CommandExamples from "./section/commands.ts";

export const Model = Schema.Struct({
  route: AppRoute,
  platform: KeyHint.KeyPlatform,
  maybeNow: Schema.Option(Schema.Finite),
  maybeOpenedAt: Schema.Option(Schema.Finite),
  schemeSwitch: Scheme.SchemeSwitch.Model,
  keyHelp: KeyHelp.Model,
  palette: CommandPalette.Model,
  screenMenu: Menu.Model,
  docIndex: DocIndex.Model,
  foundations: FoundationsPage.Model,
  markupShown: Schema.Array(Schema.String),
  screens: Screens.Model,
  copies: Copies.Model,
  buttons: ButtonsExample.Model,
  dialogs: DialogsExample.Model,
  frames: FramesExample.Model,
  forms: FormsExample.Model,
  filters: FiltersExample.Model,
  states: StatesExample.Model,
  history: HistoryExample.Model,
  lists: ListsExample.Model,
  code: CodeExample.Model,
  reading: ReadingExample.Model,
  commands: CommandExamples.Model,
  board: BoardExample.Model,
  sortable: SortableExample.Model,
  reel: ReelExample.Model,
  tabs: TabsExample.Model,
  files: FilesExample.Model,
  rail: RailExample.Model,
  tips: Tips.Model,
});

export type Model = typeof Model.Type;
