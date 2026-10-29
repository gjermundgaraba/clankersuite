import { Array, Record } from "effect";

type Covers = Readonly<Record<string, readonly string[]>>;

export const FOUNDATIONS = {
  setup: ["LiveRegion"],
  motion: ["Announcer.Flash"],
  glyphs: ["Glyph.view"],
} as const satisfies Covers;

export const COMPONENTS = {
  buttons: ["Button", "IconButton", "LinkButton", "TextButton"],
  dialogs: [
    "Dialog",
    "ConfirmDialog",
    "Card",
    "Outcome",
    "Field",
    "Announcer.Announce",
  ],
  frames: [
    "SkipLink",
    "TopBar",
    "NavStrip",
    "LinkState",
    "StatusBar",
    "Banner",
    "Window",
    "Places",
    "Wall",
    "Deck",
    "Bench",
    "Stage",
  ],
  layout: ["Panel", "PageHead", "Crumbs", "Stack", "Group", "Wrap"],
  forms: [
    "FieldGrid",
    "Fieldset",
    "Choice",
    "RadioChoices",
    "PasswordField",
    "SelectField",
    "TextareaField",
    "ErrorSummary",
    "Secret",
  ],
  filters: ["FilterStrip", "FilterChip", "QueryChip", "Chip", "Mark", "Tag"],
  states: ["EmptyState", "Loading", "Remote", "FlashWord"],
  history: ["History"],
  tables: ["Table", "PropsList", "Format.LOCALE"],
  lists: ["Rows"],
  identity: ["Identity", "Wordmark"],
  meters: ["Meter", "Stat"],
  code: ["CodeSurface", "CodeEditor", "LineDiff"],
  reading: ["Sheet", "Prose", "Toc"],
  menus: ["Menu"],
  "command-palette": ["CommandPalette", "Notice"],
  inline: ["InlineInput", "Focus"],
  toasts: ["Toast"],
  board: ["Board", "Board.cardView"],
  sortable: ["Sortable"],
  reel: ["Reel", "Reel.apply"],
  tabs: ["Tabs", "Disclosure"],
  files: ["DropZone", "CopyButton"],
  rail: ["Rail"],
  tips: ["Tips"],
  time: ["Time"],
  keys: ["KeyHint", "KeyHelp"],
  scheme: ["Scheme.SchemeSwitch", "Segmented"],
} as const satisfies Covers;

type ExportShown = Readonly<{ name: string; sectionId: string }>;

export const exportsShown = (covers: Covers): readonly ExportShown[] =>
  Array.flatMap(Record.toEntries(covers), ([sectionId, names]) =>
    Array.map(names, (name) => ({ name, sectionId }))
  );
