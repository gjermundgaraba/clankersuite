import type { Record } from "effect";
import { Array, Match, Number, Option, Schema, String } from "effect";

import { fill } from "../locale/locale.ts";
import { FocusPane, ScrollIntoView } from "./command.ts";
import {
  OutMessage,
  Subject,
  WHERE_IT_WAS,
  apply,
  isChange,
  nextPreset,
  placeAt,
  placeOf,
  placeWords,
  subjectWords,
  whereWords,
  widthWords,
} from "./layout.ts";
import type { Layout, Place } from "./layout.ts";
import type { Model } from "./model.ts";
import {
  COPY,
  focusedPaneId,
  focusedPlace,
  isHolding,
  paneHook,
  readingOrder,
} from "./model.ts";
import type { UpdateContext, UpdateReturn } from "./reel.ts";
import { announce, focusOn } from "./reel.ts";

/** What the application's keys ask of the reel. `Focus*`: focus the pane beside the focused
 *  one. `MovePane*`: move the focused pane up or down its column, or into the column beside it
 *  (past the first or last column, into a column of its own). `MoveColumn*`: move its column.
 *  `CycleWidth`: its column's width to the next preset. `PullOut`: the pane into a column of
 *  its own, right of its column. */
export const Action = Schema.Literals([
  "FocusLeft",
  "FocusRight",
  "FocusUp",
  "FocusDown",
  "MovePaneLeft",
  "MovePaneRight",
  "MovePaneUp",
  "MovePaneDown",
  "MoveColumnLeft",
  "MoveColumnRight",
  "CycleWidth",
  "PullOut",
]);

export type Action = typeof Action.Type;

const focusStep = (
  model: Model,
  layout: Layout,
  place: Place
): UpdateReturn => ({
  model: focusOn(model, place),
  commands: [
    FocusPane({ paneHook: paneHook(model, place.pane.id) }),
    ScrollIntoView({ hook: paneHook(model, place.pane.id) }),
    announce(
      fill(COPY.focused, {
        pane: place.pane.label,
        where: placeWords(layout, place),
      })
    ),
  ],
});

const requestStep = (
  model: Model,
  layout: Layout,
  place: Place,
  subject: Subject,
  maybeRequest: Option.Option<OutMessage>
): UpdateReturn =>
  Option.match(
    Option.filter(maybeRequest, (request) => isChange(layout, request)),
    {
      onNone: () => ({ model }),
      onSome: (request) => {
        const next = apply(layout, request);

        const landing = Option.getOrElse(
          placeOf(next, place.pane.id),
          () => place
        );

        const words = Option.getOrElse(
          subjectWords(layout, subject),
          () => place.pane.label
        );

        const where = Option.getOrElse(
          whereWords(next, subject),
          () => WHERE_IT_WAS
        );

        return {
          model: focusOn(model, landing),
          commands: [
            ScrollIntoView({ hook: paneHook(model, place.pane.id) }),
            announce(
              fill(COPY.moved, { subject: String.capitalize(words), where })
            ),
          ],
          outMessage: request,
        };
      },
    }
  );

const TAB_STEPS: Partial<Record.ReadonlyRecord<Action, number>> = {
  FocusLeft: -1,
  FocusUp: -1,
  FocusRight: 1,
  FocusDown: 1,
};

const performTabbed = (
  model: Model,
  action: Action,
  layout: Layout
): UpdateReturn => {
  const panes = readingOrder(layout);

  const maybeNext = Option.flatMap(
    Option.all({
      step: Option.fromUndefinedOr(TAB_STEPS[action]),
      index: Option.flatMap(focusedPaneId(model, layout), (paneId) =>
        Array.findFirstIndex(panes, (pane) => pane.id === paneId)
      ),
    }),
    ({ step, index }) =>
      Option.flatMap(Array.get(panes, index + step), (pane) =>
        Option.map(placeOf(layout, pane.id), (place) => ({
          place,
          tab: index + step + 1,
        }))
      )
  );

  return Option.match(
    Option.filter(maybeNext, () => !isHolding(model)),
    {
      onNone: () => ({ model }),
      onSome: ({ place, tab }) => ({
        model: focusOn(model, place),
        commands: [
          FocusPane({ paneHook: paneHook(model, place.pane.id) }),
          announce(
            fill(COPY.focusedTab, {
              pane: place.pane.label,
              tab,
              tabs: panes.length,
            })
          ),
        ],
      }),
    }
  );
};

const columnIdAt = (layout: Layout, index: number): Option.Option<string> =>
  Option.map(Array.get(layout, index), ({ id }) => id);

type Performing = Readonly<{ model: Model; layout: Layout; place: Place }>;

const askFor = (
  { model, layout, place }: Performing,
  maybeRequest: Option.Option<OutMessage>,
  subject: Subject = Subject.Pane({ paneId: place.pane.id })
): UpdateReturn => requestStep(model, layout, place, subject, maybeRequest);

const focusAt = (
  { model, layout, place }: Performing,
  toColumn: number,
  toRow: number
): UpdateReturn =>
  Option.match(
    Option.flatMap(Array.get(layout, toColumn), (found) =>
      placeAt(
        layout,
        toColumn,
        Number.clamp(toRow, { minimum: 0, maximum: found.panes.length - 1 })
      )
    ),
    {
      onNone: () => ({ model }),
      onSome: (next) =>
        next.pane.id === place.pane.id
          ? { model }
          : focusStep(model, layout, next),
    }
  );

const pullOutPane = (
  { place }: Performing,
  maybeBeforeColumnId: Option.Option<string>
): Option.Option<OutMessage> =>
  Option.some(
    OutMessage.PulledOutPane({ paneId: place.pane.id, maybeBeforeColumnId })
  );

const movePaneSideways = (
  performing: Performing,
  toColumn: number,
  maybeEdge: Option.Option<string>
): UpdateReturn => {
  const { layout, place } = performing;

  return askFor(
    performing,
    Option.match(Array.get(layout, toColumn), {
      onSome: (found) =>
        Option.some(
          OutMessage.MovedPane({
            paneId: place.pane.id,
            toColumnId: found.id,
            toIndex: Math.min(place.row, found.panes.length),
          })
        ),
      onNone: () => pullOutPane(performing, maybeEdge),
    })
  );
};

const movePaneInColumn = (
  performing: Performing,
  toIndex: number
): UpdateReturn => {
  const { place } = performing;

  return askFor(
    performing,
    Option.some(
      OutMessage.MovedPane({
        paneId: place.pane.id,
        toColumnId: place.column.id,
        toIndex,
      })
    )
  );
};

const moveColumn = (
  performing: Performing,
  maybeBefore: Option.Option<Option.Option<string>>
): UpdateReturn => {
  const { column } = performing.place;

  return askFor(
    performing,
    Option.map(maybeBefore, (maybeBeforeColumnId) =>
      OutMessage.MovedColumn({ columnId: column.id, maybeBeforeColumnId })
    ),
    Subject.Column({ columnId: column.id })
  );
};

const cycleWidth = ({ model, place }: Performing): UpdateReturn => {
  const { column, columnIndex, pane } = place;
  const width = nextPreset(column.width);

  return {
    model,
    commands: [
      ScrollIntoView({ hook: paneHook(model, pane.id) }),
      announce(
        fill(COPY.widened, {
          column: columnIndex + 1,
          width: widthWords(width),
        })
      ),
    ],
    outMessage: OutMessage.ResizedColumn({ columnId: column.id, width }),
  };
};

const performAt = (performing: Performing, action: Action): UpdateReturn => {
  const { model, layout, place } = performing;
  const { columnIndex, row } = place;

  return Match.value(action).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.when("FocusLeft", () => focusAt(performing, columnIndex - 1, row)),
    Match.when("FocusRight", () => focusAt(performing, columnIndex + 1, row)),
    Match.when("FocusUp", () =>
      row > 0 ? focusAt(performing, columnIndex, row - 1) : { model }
    ),
    Match.when("FocusDown", () => focusAt(performing, columnIndex, row + 1)),
    Match.when("MovePaneUp", () => movePaneInColumn(performing, row - 1)),
    Match.when("MovePaneDown", () => movePaneInColumn(performing, row + 1)),
    Match.when("MovePaneLeft", () =>
      movePaneSideways(performing, columnIndex - 1, columnIdAt(layout, 0))
    ),
    Match.when("MovePaneRight", () =>
      movePaneSideways(performing, columnIndex + 1, Option.none())
    ),
    Match.when("MoveColumnLeft", () =>
      moveColumn(
        performing,
        Option.map(columnIdAt(layout, columnIndex - 1), (before) =>
          Option.some(before)
        )
      )
    ),
    Match.when("MoveColumnRight", () =>
      moveColumn(
        performing,
        Option.map(columnIdAt(layout, columnIndex + 1), () =>
          columnIdAt(layout, columnIndex + 2)
        )
      )
    ),
    Match.when("CycleWidth", () => cycleWidth(performing)),
    Match.when("PullOut", () =>
      askFor(
        performing,
        pullOutPane(performing, columnIdAt(layout, columnIndex + 1))
      )
    ),
    Match.exhaustive
  );
};

/**
 * Does what the application's key for `action` asks, from the focused pane, against the
 * layout as the application holds it: focus moves focus the pane and scroll the reel to it;
 * moves report their request as the OutMessage, which the application applies, with focus
 * kept on the pane. Each is said through the live region. Nothing happens while something is
 * held, or where there is nowhere to go. Under tabs, only the focus keys act, stepping from tab
 * to tab.
 */
export const perform = (
  model: Model,
  action: Action,
  context: UpdateContext
): UpdateReturn => {
  const { layout, arrangement = "Strip" } = context;

  if (arrangement === "Tabs") {
    return performTabbed(model, action, layout);
  }

  return Option.match(
    Option.filter(focusedPlace(model, layout), () => !isHolding(model)),
    {
      onNone: () => ({ model }),
      onSome: (place) => performAt({ model, layout, place }, action),
    }
  );
};
