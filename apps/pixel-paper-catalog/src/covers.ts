import { Array, Record } from "effect";

type Covers = Readonly<Record<string, readonly string[]>>;

export const FOUNDATIONS = {
  setup: ["Scheme.schemeScript", "LiveRegion"],
  motion: ["Announcer.Flash"],
  glyphs: ["Glyph.view", "Glyph.glyphs", "Glyph.glyphFamilies"],
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
    "Toolbar",
    "Window",
    "Places",
    "Wall",
    "Deck",
    "Bench",
    "Stage",
  ],
  layout: ["Panel", "PageHead", "Crumbs", "Stack", "Group", "Wrap"],
  forms: [
    "Fields",
    "FieldGrid",
    "Fieldset",
    "Choice",
    "Choices",
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
  lists: ["Rows", "SelectAll"],
  identity: ["Identity", "Monogram", "Wordmark"],
  meters: ["Meter", "Stat"],
  charts: ["BarChart", "LineChart"],
  code: ["CodeSurface", "CodeEditor", "LineDiff"],
  reading: ["Sheet", "Prose", "Toc"],
  media: ["ImageFrame", "VideoFrame", "AudioFrame", "Media"],
  menus: ["Menu", "ContextMenu"],
  "command-palette": ["CommandPalette", "Notice"],
  inline: ["InlineInput", "EditableTitle", "Focus"],
  toasts: ["Toast"],
  board: ["Board", "Board.cardView"],
  sortable: ["Sortable"],
  reel: ["Reel", "Reel.apply"],
  tabs: ["Tabs", "Disclosure"],
  files: ["FileTree", "DropZone", "CopyButton"],
  rail: ["Rail"],
  tips: ["Tips"],
  diagrams: ["./adapters/mermaid"],
  time: ["Time"],
  keys: ["KeyHint", "Keymap", "KeyHelp"],
  scheme: ["Scheme.SchemeSwitch", "Scheme.schemeScript", "Segmented"],
} as const satisfies Covers;

type ExportShown = Readonly<{ name: string; sectionId: string }>;

export const exportsShown = (covers: Covers): readonly ExportShown[] =>
  Array.flatMap(Record.toEntries(covers), ([sectionId, names]) =>
    Array.map(names, (name) => ({ name, sectionId }))
  );
