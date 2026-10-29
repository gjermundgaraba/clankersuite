import { Input as UiInput } from "@foldkit/ui";
import {
  Array,
  Effect,
  Equal,
  HashSet,
  Match,
  Option,
  Schema,
  Stream,
  String,
  pipe,
} from "effect";
import * as FoldkitCommand from "foldkit/command";
import * as Dom from "foldkit/dom";
import type {
  Attribute,
  Html,
  HtmlBuilder,
  KeyboardModifiers,
} from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Render from "foldkit/render";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import * as Dialog from "../dialog/dialog.ts";
import { foldDialog } from "../dialog/fold.ts";
import { Focus } from "../focus/focus.ts";
import * as Glyph from "../glyph/glyph.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { isPlain } from "../keys/keys.ts";
import { LOCALE } from "../locale/locale.ts";
import { slotView } from "../slot/slot.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";
import {
  BindPaletteKeys,
  FIELD_ATTRIBUTE,
  OPTION_SELECTOR,
  PAGE_ATTRIBUTE,
  earlyKeys,
} from "./keys.ts";
import { findCommands, pageChoices } from "./match.ts";
import type { Choice, Command, Page } from "./match.ts";
import { Message } from "./message.ts";
import type { ArrowKey, RenderSnapshot, ShownRow } from "./message.ts";

const OpenPage = Schema.Struct({
  commandId: Schema.String,
  query: Schema.String,
  maybeCursor: Schema.Option(Schema.String),
});

type OpenPage = typeof OpenPage.Type;

/** Schema for a command palette: its Dialog, the commands' query and cursor (kept while a
 *  page is open, so Back restores them), the open page, and the choice being picked. A cursor
 *  is a row's id, so it holds to its row while the list changes. The rows are the view's
 *  (built from its `commands`), so ↑, ↓ and Enter carry what their render showed: its rows,
 *  the row it showed the cursor on, and the query and waiting arrows it was rendered with.
 *  When that query is the Model's and the render had applied the waiting arrows, those rows
 *  are the list, and update steps among them from the Model's cursor. A key pressed before the
 *  view caught up (as the palette opens, or just after typing, while the list still shows the
 *  last query's rows) cannot name a row yet: `cursorShift` counts the arrows, which the next
 *  render applies from the cursor's row, and `isEnterPending` an Enter. Such a key returns
 *  `ReportPendingKeys`, which reads the row the next render shows the cursor on: it becomes
 *  the cursor, and a waiting Enter acts on it. `renderGeneration` counts the changes to the
 *  page, the query and the waiting arrows, so a report from an older render is refused. */
export const Model = Schema.Struct({
  dialog: Dialog.Model,
  query: Schema.String,
  maybeCursor: Schema.Option(Schema.String),
  cursorShift: Schema.Finite,
  isEnterPending: Schema.Boolean,
  renderGeneration: Schema.Int,
  maybePage: Schema.Option(OpenPage),
  maybePicking: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

/** Union of OutMessages a command palette reports. `SelectedCommand`: run this command; the
 *  palette has closed first, so what it opens takes focus. `SelectedChoice`: apply this choice
 *  of that command's page; the page holds, the row printing the working cursor, until the
 *  caller reports back with `pickSucceeded` or `pickFailed`. `Closed`: the reader dismissed
 *  the palette (Escape, a press on the veil), even while a pick was out; a write already
 *  running keeps running, and its answer no longer changes the palette. */
export const OutMessage = defineMessageUnion({
  SelectedCommand: { id: Schema.String },
  SelectedChoice: { commandId: Schema.String, choiceId: Schema.String },
  Closed: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a command palette with `init`. The `id` must be unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

const fieldId = (paletteId: string): string => `${paletteId}-field`;
const listIdOf = (paletteId: string): string => `${paletteId}-list`;

/** Creates a closed command palette. */
export const init = (config: InitConfig): Model => ({
  dialog: Dialog.init({ id: config.id }),
  query: "",
  maybeCursor: Option.none(),
  cursorShift: 0,
  isEnterPending: false,
  renderGeneration: 0,
  maybePage: Option.none(),
  maybePicking: Option.none(),
});

/** The palette's id, unique in the document. */
export const id = (model: Model): string => Dialog.id(model.dialog);

/** Whether the palette is open. */
export const isOpen = (model: Model): boolean => Dialog.isOpen(model.dialog);

/** The words in the field: the open page's, or the commands'. A page whose choices are a
 *  function of what is typed reads it here. */
export const query = (model: Model): string =>
  Option.match(model.maybePage, {
    onNone: () => model.query,
    onSome: (page) => page.query,
  });

/** The command whose page is open. */
export const maybePageId = (model: Model): Option.Option<string> =>
  Option.map(model.maybePage, (page) => page.commandId);

/** Whether a picked choice is waiting for the caller's answer. */
export const isPicking = (model: Model): boolean =>
  Option.isSome(model.maybePicking);

const ROW_ATTRIBUTE = "value";

const OPENS_PAGE_ATTRIBUTE = "pixel-paper-palette-opens-page";

/**
 * Scrolls the cursor's row of the palette `paletteId` (its `id`) into view by the least
 * distance, once the view has rendered. The palette returns it itself as the cursor moves, the
 * query changes or a page opens; an application returns it too when the rows change under an
 * open palette (see `maybeCursorId`), or as it opens one on a page whose cursor may be far
 * down, and resolves it with `Message.CompletedScrollToCursor` in a Scene.
 */
export const ScrollToCursor = FoldkitCommand.define("ScrollToCursor", {
  args: { paletteId: Schema.String },
  messages: [Message.CompletedScrollToCursor],
  execute: ({ paletteId }) =>
    Effect.suspend(() =>
      Dom.scrollIntoView(
        `#${CSS.escape(listIdOf(paletteId))} [aria-selected="true"]`
      )
    ).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToCursor())),
});

const shownRowOf = (row: Element): Option.Option<ShownRow> =>
  Option.map(
    Option.fromNullishOr(row.getAttribute(`data-${ROW_ATTRIBUTE}`)),
    (rowId) => ({
      id: rowId,
      isHeld: row.getAttribute("aria-disabled") === "true",
      hasPage: row.hasAttribute(`data-${OPENS_PAGE_ATTRIBUTE}`),
    })
  );

const find = (selector: string): Option.Option<Element> =>
  Option.fromNullishOr(document.querySelector(selector));

const shownCursorOf = (paletteId: string): Option.Option<ShownRow> =>
  Option.flatMap(
    find(
      `#${CSS.escape(listIdOf(paletteId))} ${OPTION_SELECTOR}[aria-selected="true"]`
    ),
    shownRowOf
  );

/** Reads, once the next render has committed, the row it shows the cursor on while keys wait
 *  for it (see `Model`), with the Model's `renderGeneration` as they waited, so update knows
 *  whether that render is still the list. The palette's update returns it as a key waits; in
 *  a Scene, resolve it with `Message.CompletedReportPendingKeys`. */
export const ReportPendingKeys = FoldkitCommand.define("ReportPendingKeys", {
  args: {
    paletteId: Schema.String,
    renderGeneration: Schema.Int,
  },
  messages: [Message.CompletedReportPendingKeys],
  execute: ({ paletteId, renderGeneration }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      const maybeRow = yield* Effect.sync(() => shownCursorOf(paletteId));

      return Message.CompletedReportPendingKeys({ renderGeneration, maybeRow });
    }),
});

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const scrollPaletteToCursor = (model: Model) =>
  ScrollToCursor({ paletteId: id(model) });

const reportPendingKeys = (model: Model) =>
  ReportPendingKeys({
    paletteId: id(model),
    renderGeneration: model.renderGeneration,
  });

const focusField = (model: Model) => Focus({ id: fieldId(id(model)) });

const toClosed = Dialog.OutMessage.match<OutMessage>({
  Closed: () => OutMessage.Closed(),
});

const dialogFold = foldDialog(Dialog, {
  read: (model: Model) => model.dialog,
  write: (model: Model, nextDialog: Dialog.Model): Model =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: (message: Dialog.Message) =>
    Message.GotDialogMessage({ message }),
  toParentOutMessage: toClosed,
});

const freshPage = (commandId: string): OpenPage => ({
  commandId,
  query: "",
  maybeCursor: Option.none(),
});

const nextGeneration = (generation: number): number => generation + 1;

const clearPendingKeys = (model: Model): Model =>
  modifyFields(model, {
    cursorShift: () => 0,
    isEnterPending: () => false,
    renderGeneration: nextGeneration,
  });

const fresh = (model: Model, maybePage: Option.Option<OpenPage>): Model =>
  clearPendingKeys(
    modifyFields(model, {
      query: () => "",
      maybeCursor: () => Option.none(),
      maybePage: () => maybePage,
      maybePicking: () => Option.none(),
    })
  );

const followShown = (
  model: Model,
  maybeShownPage: Option.Option<string>
): Model =>
  Equal.equals(maybePageId(model), maybeShownPage)
    ? model
    : clearPendingKeys(
        modifyFields(model, {
          maybePage: () => Option.map(maybeShownPage, freshPage),
          maybePicking: () => Option.none(),
        })
      );

const modifyPage = (
  model: Model,
  modifyOpenPage: (page: OpenPage) => OpenPage
): Model => modifyFields(model, { maybePage: Option.map(modifyOpenPage) });

const unlessPicking = (
  model: Model,
  next: (model: Model) => UpdateReturn
): UpdateReturn => (isPicking(model) ? { model } : next(model));

const leavePage = (model: Model): UpdateReturn =>
  isPicking(model) || Option.isNone(model.maybePage)
    ? { model }
    : {
        model: clearPendingKeys(
          modifyFields(model, { maybePage: () => Option.none() })
        ),
        commands: [focusField(model), scrollPaletteToCursor(model)],
      };

const openPage = (model: Model, commandId: string): UpdateReturn => ({
  model: clearPendingKeys(
    modifyFields(model, { maybePage: () => Option.some(freshPage(commandId)) })
  ),
  commands: [focusField(model), scrollPaletteToCursor(model)],
});

const selectCommand = (model: Model, commandId: string): UpdateReturn =>
  pipe(
    dialogFold.close(model),
    Update.withOutMessage(OutMessage.SelectedCommand({ id: commandId }))
  );

const moveCursor = (model: Model, cursorId: string): Model =>
  modifyFields(
    Option.match(model.maybePage, {
      onNone: () =>
        modifyFields(model, { maybeCursor: () => Option.some(cursorId) }),
      onSome: () =>
        modifyPage(model, (page) =>
          modifyFields(page, { maybeCursor: () => Option.some(cursorId) })
        ),
    }),
    { cursorShift: () => 0, renderGeneration: nextGeneration }
  );

const pick = (
  model: Model,
  commandId: string,
  choiceId: string
): UpdateReturn => ({
  model: clearPendingKeys(
    modifyFields(moveCursor(model, choiceId), {
      maybePicking: () => Option.some(choiceId),
    })
  ),
  outMessage: OutMessage.SelectedChoice({ commandId, choiceId }),
});

const runRow = (model: Model, row: ShownRow): UpdateReturn => {
  if (row.isHeld) {
    return { model };
  }

  return Option.match(maybePageId(model), {
    onSome: (commandId) => pick(model, commandId, row.id),
    onNone: () =>
      row.hasPage ? openPage(model, row.id) : selectCommand(model, row.id),
  });
};

const maybeCurrentCursor = (model: Model): Option.Option<string> =>
  Option.match(model.maybePage, {
    onNone: () => model.maybeCursor,
    onSome: (page) => page.maybeCursor,
  });

const ARROW_STEP: Readonly<Record<ArrowKey, number>> = {
  ArrowUp: -1,
  ArrowDown: 1,
};

const isListed = (
  rows: ReadonlyArray<Readonly<{ id: string }>>,
  rowId: string
): boolean => Array.some(rows, (row) => row.id === rowId);

type CursorAsShown =
  | Readonly<{ _tag: "Listed"; rowId: string }>
  | Readonly<{ _tag: "Shown"; maybeRowId: Option.Option<string> }>
  | Readonly<{ _tag: "Waiting" }>;

const cursorAsShown = (model: Model, shown: RenderSnapshot): CursorAsShown => {
  const { rows, maybeShownCursor, shownQuery, shownShift } = shown;
  const isTheList = shownQuery === query(model);
  const hasNoWaitingArrows = model.cursorShift === 0;
  const hasAppliedWaitingArrows = shownShift === model.cursorShift;

  if (isTheList && hasNoWaitingArrows) {
    return Option.match(
      Option.filter(maybeCurrentCursor(model), (rowId) =>
        isListed(rows, rowId)
      ),
      {
        onSome: (rowId): CursorAsShown => ({ _tag: "Listed", rowId }),
        onNone: (): CursorAsShown => ({
          _tag: "Shown",
          maybeRowId: maybeShownCursor,
        }),
      }
    );
  } else if (isTheList && hasAppliedWaitingArrows) {
    return { _tag: "Shown", maybeRowId: maybeShownCursor };
  }

  return { _tag: "Waiting" };
};

const stepTo = (model: Model, rowId: string): UpdateReturn => {
  const moved = moveCursor(model, rowId);

  return {
    model: moved,
    commands: [
      scrollPaletteToCursor(model),
      ...(moved.isEnterPending ? [reportPendingKeys(moved)] : []),
    ],
  };
};

const rowAfter = <Row extends Readonly<{ id: string }>>(
  rows: readonly Row[],
  maybeFrom: Option.Option<string>,
  steps: number
): Option.Option<Row> =>
  pipe(
    maybeFrom,
    Option.flatMap((rowId) =>
      Array.findFirstIndex(rows, (row) => row.id === rowId)
    ),
    Option.flatMap((index) =>
      Array.get(rows, Math.min(Math.max(index + steps, 0), rows.length - 1))
    )
  );

const stepFrom = (
  model: Model,
  key: ArrowKey,
  rows: readonly ShownRow[],
  maybeFrom: Option.Option<string>
): UpdateReturn =>
  Option.match(rowAfter(rows, maybeFrom, ARROW_STEP[key]), {
    onNone: () => ({ model }),
    onSome: (row) => stepTo(model, row.id),
  });

const pendArrow = (model: Model, key: ArrowKey): UpdateReturn => {
  const pending = modifyFields(model, {
    cursorShift: (shift) => shift + ARROW_STEP[key],
    renderGeneration: nextGeneration,
  });

  return {
    model: pending,
    commands: [scrollPaletteToCursor(model), reportPendingKeys(pending)],
  };
};

const pressArrow = (
  model: Model,
  key: ArrowKey,
  shown: RenderSnapshot
): UpdateReturn =>
  Match.valueTags(cursorAsShown(model, shown), {
    Listed: ({ rowId }) => stepFrom(model, key, shown.rows, Option.some(rowId)),
    Shown: ({ maybeRowId }) => stepFrom(model, key, shown.rows, maybeRowId),
    Waiting: () => pendArrow(model, key),
  });

const pendEnter = (model: Model): UpdateReturn => {
  const pending = modifyFields(model, { isEnterPending: () => true });

  return { model: pending, commands: [reportPendingKeys(pending)] };
};

const enterOn = (
  model: Model,
  rows: readonly ShownRow[],
  maybeRowId: Option.Option<string>
): UpdateReturn =>
  pipe(
    maybeRowId,
    Option.flatMap((rowId) => Array.findFirst(rows, (row) => row.id === rowId)),
    Option.match({
      onNone: () => ({ model }),
      onSome: (row) => runRow(model, row),
    })
  );

const pressEnter = (model: Model, shown: RenderSnapshot): UpdateReturn =>
  Match.valueTags(cursorAsShown(model, shown), {
    Listed: ({ rowId }) => enterOn(model, shown.rows, Option.some(rowId)),
    Shown: ({ maybeRowId }) => enterOn(model, shown.rows, maybeRowId),
    Waiting: () => pendEnter(model),
  });

const isPending = (model: Model): boolean =>
  model.cursorShift !== 0 || model.isEnterPending;

type PendingReport = typeof Message.CompletedReportPendingKeys.Type;

const settlePending = (model: Model, report: PendingReport): UpdateReturn => {
  if (!isPending(model) || report.renderGeneration !== model.renderGeneration) {
    return { model };
  }

  const settled = clearPendingKeys(model);

  return Option.match(report.maybeRow, {
    onNone: () => ({ model: settled }),
    onSome: (row) => {
      const moved = moveCursor(settled, row.id);
      const ran = model.isEnterPending ? runRow(moved, row) : { model: moved };

      return {
        ...ran,
        commands: [scrollPaletteToCursor(model), ...(ran.commands ?? [])],
      };
    },
  });
};

const updateQuery = (model: Model, value: string): Model =>
  clearPendingKeys(
    Option.match(model.maybePage, {
      onNone: () =>
        modifyFields(model, {
          query: () => value,
          maybeCursor: () => Option.none(),
        }),
      onSome: () =>
        modifyPage(model, (page) =>
          modifyFields(page, {
            query: () => value,
            maybeCursor: () => Option.none(),
          })
        ),
    })
  );

/** Processes a command palette Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotDialogMessage: ({ message: dialogMessage }) =>
      dialogFold.update(model, dialogMessage),
    UpdatedQuery: ({ value, maybeShownPage }) =>
      unlessPicking(followShown(model, maybeShownPage), (shown) => ({
        model: updateQuery(shown, value),
        commands: [scrollPaletteToCursor(shown)],
      })),
    PressedArrowKey: ({ key, snapshot }) =>
      unlessPicking(followShown(model, snapshot.maybeShownPage), (current) =>
        pressArrow(current, key, snapshot)
      ),
    PressedEarlyArrowKey: ({ key }) =>
      unlessPicking(model, (current) => pendArrow(current, key)),
    CompletedReportPendingKeys: (report) => settlePending(model, report),
    PressedEnter: ({ snapshot }) =>
      unlessPicking(followShown(model, snapshot.maybeShownPage), (current) =>
        pressEnter(current, snapshot)
      ),
    PressedEarlyEnter: () => unlessPicking(model, pendEnter),
    PressedBackspace: ({ maybeShownPage }) =>
      leavePage(followShown(model, maybeShownPage)),
    ClickedRow: ({ row, maybeShownPage }) =>
      unlessPicking(followShown(model, maybeShownPage), (current) =>
        runRow(current, row)
      ),
    ClickedBack: () => leavePage(model),
    CompletedScrollToCursor: () => ({ model }),
    CompletedFocus: () => ({ model }),
  });

/** Opens the palette on the commands, with an empty field and the cursor on the first row.
 *  Snapshot what the commands act on (the selected item, its title for `scope`) in the
 *  caller's Model as it opens, and build `commands` from that snapshot until it closes. */
export const open = (model: Model): Update.Return<Model, Message> =>
  dialogFold.open(fresh(model, Option.none()));

/** Configuration for `openAt`. */
export type OpenAtConfig = Readonly<{
  /** The command whose page opens, one that has a page. The cursor starts on its `start`,
   *  else its `current`. */
  commandId: string;
}>;

/** Opens the palette straight on a command's page. Back still leads to the commands. */
export const openAt = (
  model: Model,
  config: OpenAtConfig
): Update.Return<Model, Message> =>
  dialogFold.open(fresh(model, Option.some(freshPage(config.commandId))));

/** The caller applied the choice: the palette closes. An answer for a pick that is no longer
 *  out (the palette was dismissed, its page left, or a newer pick replaced it) changes
 *  nothing; the caller keeps the write it made. */
export const pickSucceeded = (
  model: Model,
  choiceId: string
): Update.Return<Model, Message> =>
  Option.contains(model.maybePicking, choiceId)
    ? dialogFold.close(fresh(model, Option.none()))
    : { model };

/** The caller refused the choice: the page stays with its query, focus and the cursor on that
 *  choice; say why in the view's `toDetailView`. An answer for a pick that is no longer out
 *  changes nothing. */
export const pickFailed = (
  model: Model,
  choiceId: string
): Update.Return<Model, Message> =>
  Option.contains(model.maybePicking, choiceId)
    ? { model: modifyFields(model, { maybePicking: () => Option.none() }) }
    : { model };

const earlyKeySubscriptions = Subscription.make<Model, Message>()((entry) => ({
  earlyKeys: entry(
    { maybeOpenId: Schema.Option(Schema.String) },
    {
      modelToDependencies: (model) => ({
        maybeOpenId: isOpen(model) ? Option.some(id(model)) : Option.none(),
      }),
      dependenciesToStream: ({ maybeOpenId }) =>
        Option.match(maybeOpenId, {
          onNone: () => Stream.empty,
          onSome: earlyKeys,
        }),
    }
  ),
}));

/** While the palette is open, takes ↑ ↓ and Enter pressed before its field has focus (the
 *  field's own are the view's), on the window, before the page's own key bindings see them,
 *  so the keys pressed straight after the one that opened it are not lost. Lift it into the
 *  application's Subscriptions, once per palette, with a key prefix of the parent's that no
 *  other record on the page uses: `subscriptions("palette")` is keyed `paletteEarlyKeys`. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, earlyKeySubscriptions);

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Built from what the caller snapshotted as the palette opened (see `open`). A command
   *  that leaves while its page is open sends the reader back to the commands. */
  commands: readonly Command[];
  /** What the commands act on, kept on every page (the selected item's name). Defaults to
   *  `"commands"`. */
  scope?: string;
  /** What else can be typed, for the placeholder (`"type a command or a title"`). */
  noun?: string;
  /** Above the list, on the commands and on every page: the application's own content (a
   *  sync notice and its retry, why a pick was refused). A function, so its controls send the
   *  application's Messages. */
  toDetailView?: () => ReadonlyArray<Html | string>;
  /** The page's live region and toasts while this is the topmost open dialog, `undefined`
   *  while it is not (see `Dialog`). */
  toLiveRegionView?: (() => Html) | undefined;
}>;

type ShownPageState = Readonly<{ page: Page; state: OpenPage }>;

type Shown = Readonly<{
  maybePage: Option.Option<ShownPageState>;
  rows: ReadonlyArray<Choice | Command>;
  contextIds: HashSet.HashSet<string>;
  maybeCursorId: Option.Option<string>;
}>;

const pageOf = (
  commands: readonly Command[],
  state: OpenPage
): Option.Option<ShownPageState> =>
  pipe(
    Array.findFirst(commands, (command) => command.id === state.commandId),
    Option.flatMap((command) => Option.fromNullishOr(command.page)),
    Option.map((page) => ({ page, state }))
  );

const firstListed = (
  rows: ReadonlyArray<Readonly<{ id: string }>>,
  candidates: ReadonlyArray<Option.Option<string>>
): Option.Option<string> =>
  Array.findFirst(Array.getSomes(candidates), (cursorId) =>
    isListed(rows, cursorId)
  );

const firstId = (
  rows: ReadonlyArray<Readonly<{ id: string }>>
): Option.Option<string> => Option.map(Array.head(rows), (row) => row.id);

const cursorRowFallback = ({
  maybeMovedTo,
  rows,
  found,
  pageDefaults,
}: Readonly<{
  maybeMovedTo: Option.Option<string>;
  rows: ReadonlyArray<Readonly<{ id: string }>>;
  found: ReadonlyArray<Readonly<{ id: string }>>;
  pageDefaults: ReadonlyArray<Option.Option<string>>;
}>): Option.Option<string> =>
  pipe(
    Option.filter(maybeMovedTo, (rowId) => isListed(rows, rowId)),
    Option.orElse(() => firstListed(found, pageDefaults)),
    Option.orElse(() => firstId(found))
  );

const shifted = (shown: Shown, shift: number): Shown => ({
  ...shown,
  maybeCursorId: Option.map(
    rowAfter(shown.rows, shown.maybeCursorId, shift),
    (row) => row.id
  ),
});

const unshiftedOf = (model: Model, commands: readonly Command[]): Shown => {
  const maybePage = Option.flatMap(model.maybePage, (state) =>
    pageOf(commands, state)
  );

  return Option.match(maybePage, {
    onNone: () => {
      const rows = findCommands(commands, model.query);

      return {
        maybePage,
        rows,
        contextIds: HashSet.empty(),
        maybeCursorId: cursorRowFallback({
          maybeMovedTo: model.maybeCursor,
          rows,
          found: rows,
          pageDefaults: [],
        }),
      };
    },
    onSome: ({ page, state }) => {
      const { rows, found, contextIds } = pageChoices(page, state.query);

      return {
        maybePage,
        rows,
        contextIds,
        maybeCursorId: cursorRowFallback({
          maybeMovedTo: state.maybeCursor,
          rows,
          found,
          pageDefaults: [
            Option.fromNullishOr(page.start),
            Option.fromNullishOr(page.current),
          ],
        }),
      };
    },
  });
};

const hasCursorRowLeft = (model: Model, unshifted: Shown): boolean =>
  Option.exists(
    maybeCurrentCursor(model),
    (rowId) => !Option.contains(unshifted.maybeCursorId, rowId)
  );

const dropArrowsWhenCursorRowGone = (model: Model, unshifted: Shown): Shown =>
  hasCursorRowLeft(model, unshifted)
    ? unshifted
    : shifted(unshifted, model.cursorShift);

const shownOf = (model: Model, commands: readonly Command[]): Shown =>
  dropArrowsWhenCursorRowGone(model, unshiftedOf(model, commands));

/** The row the cursor is on as the view shows it with `commands`: the row the reader moved it
 *  to while that row is listed, else the page's `start` or `current` while the query finds it,
 *  else the first row the query finds; none when nothing is listed. Compare it before and after
 *  the caller's commands change to know when the cursor fell to another row (its row left) and
 *  should be scrolled into view with `ScrollToCursor`; a cursor whose row is still listed keeps
 *  it, and the list its scroll. */
export const maybeCursorId = (
  model: Model,
  commands: readonly Command[]
): Option.Option<string> => shownOf(model, commands).maybeCursorId;

const isCommand = (row: Choice | Command): row is Command => "group" in row;

const isCurrentRow = (shown: Shown, row: Choice | Command): boolean =>
  Option.exists(shown.maybePage, ({ page }) => page.current === row.id);

const isContextRow = (shown: Shown, row: Choice | Command): boolean =>
  HashSet.has(shown.contextIds, row.id);

const levelOf = (row: Choice | Command): Option.Option<number> =>
  "level" in row ? Option.fromNullishOr(row.level) : Option.none();

const shownRowFor = (shown: Shown, row: Choice | Command): ShownRow => ({
  id: row.id,
  isHeld: row.isDisabled === true || isCurrentRow(shown, row),
  hasPage: isCommand(row) && row.page !== undefined,
});

const shownQueryOf = (model: Model, shown: Shown): string =>
  Option.match(shown.maybePage, {
    onNone: () => model.query,
    onSome: ({ state }) => state.query,
  });

const shownPageIdOf = (shown: Shown): Option.Option<string> =>
  Option.map(shown.maybePage, ({ state }) => state.commandId);

const renderedListOf = (model: Model, shown: Shown): RenderSnapshot => ({
  rows: Array.map(shown.rows, (row) => shownRowFor(shown, row)),
  maybeShownCursor: shown.maybeCursorId,
  maybeShownPage: shownPageIdOf(shown),
  shownQuery: shownQueryOf(model, shown),
  shownShift: model.cursorShift,
});

const rowKeysWithRenderedList =
  (model: Model, shown: Shown) =>
  (key: string, modifiers: KeyboardModifiers): Option.Option<Message> => {
    const snapshot = renderedListOf(model, shown);

    return isPicking(model) || !isPlain(modifiers)
      ? Option.none()
      : Match.value(key).pipe(
          Match.withReturnType<Option.Option<Message>>(),
          Match.whenOr("ArrowDown", "ArrowUp", (arrow) =>
            Option.some(Message.PressedArrowKey({ key: arrow, snapshot }))
          ),
          Match.when("Enter", () =>
            Option.some(Message.PressedEnter({ snapshot }))
          ),
          Match.orElse(() => Option.none())
        );
  };

const optionId = (paletteId: string, index: number): string =>
  `${paletteId}-option-${index}`;

const NOTHING_FOUND = "nothing matches · try fewer letters";
const COMMANDS_FOOT = "↑ ↓ move · enter runs · esc closes";
const PAGE_FOOT = "↑ ↓ move · enter picks · ⌫ back · esc closes";

const resultWord = (count: number): string =>
  count === 1 ? "result" : "results";

const countWords = (count: number): string =>
  count === 0
    ? "Nothing matches."
    : `${count.toLocaleString(LOCALE)} ${resultWord(count)}.`;

const rowPartsView = (
  model: Model,
  shown: Shown,
  row: Choice | Command,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const hint = row.isDisabled === true ? (row.reason ?? row.hint) : row.hint;

  const opens = h.span(
    [h.Class("glyph opens"), h.AriaHidden(true)],
    [Glyph.view({ name: "caret-right" }, h)]
  );

  return [
    ...(row.glyph === undefined
      ? []
      : [h.span([h.Class("glyph")], [Glyph.view({ name: row.glyph }, h)])]),
    h.span(
      [h.Class("palette-label")],
      [
        row.label,
        ...(isContextRow(shown, row)
          ? [h.span([h.Class("sr-only")], [" (context)"])]
          : []),
      ]
    ),
    ...(Option.contains(model.maybePicking, row.id)
      ? [h.span([h.Class("cursor"), h.AriaHidden(true)])]
      : []),
    ...(isCurrentRow(shown, row)
      ? [h.span([h.Class("tag")], ["current"])]
      : []),
    ...(hint === undefined ? [] : [h.span([h.Class("hint")], [hint])]),
    ...(shownRowFor(shown, row).hasPage ? [opens] : []),
  ];
};

const rowView = (
  model: Model,
  shown: Shown,
  row: Choice | Command,
  index: number,
  h: HtmlBuilder<Message>
): Html => {
  const shownRow = shownRowFor(shown, row);

  return h.keyed("div")(
    row.id,
    [
      h.Id(optionId(id(model), index)),
      h.Role("option"),
      h.AriaSelected(Option.contains(shown.maybeCursorId, row.id)),
      ...(shownRow.isHeld ? [h.AriaDisabled(true)] : []),
      h.DataAttribute(ROW_ATTRIBUTE, row.id),
      ...(shownRow.hasPage ? [h.DataAttribute(OPENS_PAGE_ATTRIBUTE, "")] : []),
      h.Class(
        Array.join(
          [
            "palette-row",
            ...(row.isAuthored === true ? ["authored"] : []),
            ...(isContextRow(shown, row) ? ["context"] : []),
          ],
          " "
        )
      ),
      ...Option.match(levelOf(row), {
        onNone: () => [],
        onSome: (level) => [h.Style({ "--palette-level": `${level}` })],
      }),
      ...(shownRow.isHeld || isPicking(model)
        ? []
        : [
            h.OnClick(
              Message.ClickedRow({
                row: shownRow,
                maybeShownPage: shownPageIdOf(shown),
              })
            ),
          ]),
    ],
    rowPartsView(model, shown, row, h)
  );
};

const groupedRows = (
  model: Model,
  shown: Shown,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const indexed = Array.map(shown.rows, (row, index) => ({ row, index }));

  return Option.match(shown.maybePage, {
    onSome: () =>
      Array.map(indexed, ({ row, index }) =>
        rowView(model, shown, row, index, h)
      ),
    onNone: () => {
      const groups = Array.dedupe(
        Array.map(shown.rows, (row) => (isCommand(row) ? row.group : ""))
      );

      return Array.map(groups, (group, groupIndex) => {
        const headingId = `${id(model)}-group-${groupIndex}`;

        return h.keyed("div")(
          `group-${group}`,
          [h.Role("group"), h.AriaLabelledBy(headingId)],
          [
            h.div(
              [
                h.Id(headingId),
                h.Role("presentation"),
                h.Class("palette-group"),
              ],
              [group]
            ),
            ...Array.map(
              Array.filter(
                indexed,
                ({ row }) => isCommand(row) && row.group === group
              ),
              ({ row, index }) => rowView(model, shown, row, index, h)
            ),
          ]
        );
      });
    },
  });
};

const comboboxAttributes = (
  model: Model,
  shown: Shown,
  noun: string,
  h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> => {
  const paletteId = id(model);

  const maybeCursorIndex = Option.flatMap(shown.maybeCursorId, (cursorId) =>
    Array.findFirstIndex(shown.rows, (row) => row.id === cursorId)
  );

  return [
    h.OnKeyDownPreventDefault(rowKeysWithRenderedList(model, shown)),
    h.Role("combobox"),
    h.AriaExpanded(true),
    h.AriaControls(listIdOf(paletteId)),
    h.AriaAutocomplete("list"),
    ...Option.toArray(
      Option.map(maybeCursorIndex, (index) =>
        h.AriaActiveDescendant(optionId(paletteId, index))
      )
    ),
    h.AriaLabel(
      Option.match(shown.maybePage, {
        onNone: () => `Command or ${noun}`,
        onSome: ({ page }) => page.title,
      })
    ),
    h.Autocomplete("off"),
    h.DataAttribute(FIELD_ATTRIBUTE, ""),
  ];
};

const fieldView = (
  model: Model,
  shown: Shown,
  noun: string,
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html => {
  const maybeShownPage = shownPageIdOf(shown);

  return UiInput.view(
    {
      id: fieldId(id(model)),
      value: shownQueryOf(model, shown),
      onInput: (value) => Message.UpdatedQuery({ value, maybeShownPage }),
      isReadOnly: isPicking(model),
      placeholder: Option.match(shown.maybePage, {
        onNone: () => `type a command or a ${noun}`,
        onSome: ({ page }) => page.find ?? "type to narrow",
      }),
      toView: (groups) =>
        h.input([
          ...render.initialFocus,
          ...groups.input,
          ...comboboxAttributes(model, shown, noun, h),
        ]),
    },
    h
  );
};

const headView = (
  model: Model,
  shown: Shown,
  scope: string,
  field: Html,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("palette-q field")],
    [
      ...Option.toArray(
        Option.map(shown.maybePage, () =>
          IconButton.view(
            {
              glyph: "arrow-left",
              label: "Back",
              isQuiet: true,
              isDisabled: isPicking(model),
              onClick: Message.ClickedBack(),
            },
            h
          )
        )
      ),
      h.span([h.Class("palette-scope")], [scope]),
      ...Option.toArray(
        Option.map(shown.maybePage, ({ page }) =>
          h.span([h.Class("palette-title")], [page.title])
        )
      ),
      field,
    ]
  );

const listView = (model: Model, shown: Shown, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id(listIdOf(id(model))),
      h.Role("listbox"),
      h.AriaLabel(
        Option.match(shown.maybePage, {
          onNone: () => "Results",
          onSome: ({ page }) => page.title,
        })
      ),
      ...(isPicking(model) ? [h.AriaBusy(true)] : []),
      h.Class("palette-list"),
    ],
    Array.match(shown.rows, {
      onEmpty: () => [
        h.div(
          [h.Role("presentation"), h.Class("palette-group")],
          [NOTHING_FOUND]
        ),
      ],
      onNonEmpty: () => groupedRows(model, shown, h),
    })
  );

const countView = (
  model: Model,
  shown: Shown,
  h: HtmlBuilder<Message>
): Html => {
  const shownQuery = shownQueryOf(model, shown);

  return h.div(
    [h.Role("status"), h.Class("sr-only")],
    String.isEmpty(shownQuery)
      ? []
      : [countWords(shown.rows.length - HashSet.size(shown.contextIds))]
  );
};

const cardView = (
  model: Model,
  viewInputs: ViewInputs,
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html => {
  const {
    commands,
    scope = "commands",
    noun = "title",
    toDetailView = () => [],
  } = viewInputs;

  const shown = shownOf(model, commands);

  return h.div(
    [
      ...Option.toArray(
        Option.map(shownPageIdOf(shown), (commandId) =>
          h.DataAttribute(PAGE_ATTRIBUTE, commandId)
        )
      ),
      h.OnMount(BindPaletteKeys()),
      h.Class("card palette"),
    ],
    [
      headView(
        model,
        shown,
        scope,
        fieldView(model, shown, noun, render, h),
        h
      ),
      ...slotView("div", "palette-detail", toDetailView(), h),
      listView(model, shown, h),
      countView(model, shown, h),
      h.div(
        [h.Class("palette-more")],
        [
          Option.match(shown.maybePage, {
            onNone: () => COMMANDS_FOOT,
            onSome: () => PAGE_FOOT,
          }),
        ]
      ),
    ]
  );
};

/**
 * Type to find a command or a title; one inverted cursor row, moved by ↑ and ↓ only
 * (stopping at the ends; the pointer shades a row but never moves the cursor); Enter or a
 * click selects it, and the palette closes first so what the command opens takes focus. A
 * command with a page opens that page in place: Back, or Backspace in an empty field, returns
 * to the commands with their query and cursor as they were. The choice in force is tagged
 * current and cannot be picked; a picked choice holds the page until the caller answers. Once
 * a query is typed, a polite status says how many rows it finds. Escape closes the whole
 * palette.
 *
 * A pixel-paper Dialog (named "Commands", hung near the top) holding a field built on
 * `@foldkit/ui`'s Input as an ARIA combobox (`aria-activedescendant` on the cursor's row) over
 * an always open `role="listbox"` of `role="option"` rows, grouped under their headings.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.submodel({
      slotId: id(model),
      model: model.dialog,
      view: Dialog.view,
      viewInputs: {
        label: "Commands",
        placement: "Top",
        toLiveRegionView: viewInputs.toLiveRegionView,
        toView: (render) => cardView(model, viewInputs, render, h),
      },
      toParentMessage: (message) => Message.GotDialogMessage({ message }),
    })
);
