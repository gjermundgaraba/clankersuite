import type { Cause } from "effect";
import { Array, Effect, Number, Option, Schema, Stream } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import * as Render from "foldkit/render";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import type * as Update from "foldkit/update";

import * as Button from "../button/button.ts";
import { htmlElement } from "../dom/html-element.ts";
import {
  escapeKeys,
  markDragging,
  pointerMessages,
  splitterAttributes,
} from "../drag/drag.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";

const Resizing = Schema.Struct({
  pointerId: Schema.Finite,
  pressX: Schema.Finite,
  fromWidth: Schema.Finite,
  width: Schema.Finite,
});

/** Schema for a rail: whether it is open as a drawer (at 900px and under; wider, it is always
 *  in the page and this stays false), and its splitter while a pointer drags it. Its width,
 *  and whether the reader hid it, are the parent's. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  maybeResizing: Schema.Option(Resizing),
});

export type Model = typeof Model.Type;

/** Union of all Messages a rail can produce. `ClosedDrawer` is the browser closing it on
 *  Escape or a press on the veil; `BlurredDrawer` is focus leaving it; `WidenedPastDrawer` is
 *  the window growing past 900px while it is open, where the rail is back in the page. */
export const Message = defineMessageUnion({
  ClickedOpen: {},
  ClickedToggle: {},
  PressedSplitter: {
    pointerId: Schema.Finite,
    clientX: Schema.Finite,
    width: Schema.Finite,
  },
  MovedSplitter: { clientX: Schema.Finite },
  ReleasedSplitter: { clientX: Schema.Finite },
  CancelledSplitter: {},
  PressedEscape: {},
  PressedSplitterKey: { width: Schema.Finite },
  ClickedClose: {},
  ClosedDrawer: {},
  BlurredDrawer: {},
  WidenedPastDrawer: {},
  CompletedShowRailDrawer: {},
  CompletedHideRailDrawer: {},
  CompletedFocusRailToggle: {},
});

export type Message = typeof Message.Type;

/** What a rail asks of its parent. `ResizedRail`: its splitter was let go, or stepped by a
 *  key, at `width` pixels, within the rail's bounds; the parent keeps it (per client) and
 *  passes it back as the view's `maybeWidth`. `ToggledRail`: its toggle was pressed; the
 *  parent flips whether it keeps the rail hidden (per client) and passes it back as the view's
 *  `isHidden`. */
export const OutMessage = defineMessageUnion({
  ResizedRail: { width: Schema.Finite },
  ToggledRail: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a rail with `init`. The `id` is the rail's, unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a rail, closed, its splitter at rest. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  maybeResizing: Option.none(),
});

const WIDEST_DRAWER_WINDOW = 900;
const NARROWEST_RAILED_WINDOW = WIDEST_DRAWER_WINDOW + 1;
const LEAST_DECK_WIDTH = 421;

export const WIDTH = {
  start: 272,
  leastFittingPanels: 220,
  mostLeavingLeastDeck: NARROWEST_RAILED_WINDOW - LEAST_DECK_WIDTH,
  arrowStep: 16,
};

const bounded = (width: number): number =>
  Math.round(
    Number.clamp(width, {
      minimum: WIDTH.leastFittingPanels,
      maximum: WIDTH.mostLeavingLeastDeck,
    })
  );

/** The rail's id, unique in the document. */
export const id = (model: Model): string => model.id;

/** Whether the rail is open as a drawer: a parent pauses its own page keys while it is. */
export const isOpen = (model: Model): boolean => model.isOpen;

const openButtonId = (model: Model): string => `${model.id}-open`;

const toggleId = (model: Model): string => `${model.id}-toggle`;

const FOCUSABLE =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]";

const findRail = (
  railId: string
): Effect.Effect<HTMLElement, Cause.NoSuchElementError> =>
  Effect.suspend(() =>
    Effect.fromOption(htmlElement(`#${CSS.escape(railId)}`))
  );

export const firstTabStop = (rail: Element): Option.Option<HTMLElement> =>
  Array.findFirst(
    Array.fromIterable(
      rail.querySelectorAll<HTMLElement>(`.rail-head ~ * :is(${FOCUSABLE})`)
    ),
    (control) =>
      control.tabIndex >= 0 &&
      control.closest("[inert], [hidden], .rail-toggle") === null
  );

/** Opens the rail as a drawer over the page and puts focus on its first control past its
 *  head. */
export const ShowRailDrawer = Command.define("ShowRailDrawer", {
  args: { railId: Schema.String },
  messages: [Message.CompletedShowRailDrawer],
  execute: ({ railId }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      const rail = yield* findRail(railId);

      if (!rail.matches(":popover-open")) {
        yield* Effect.try(() => {
          rail.showPopover();
        });
      }

      const control = yield* Effect.fromOption(firstTabStop(rail));
      control.focus();
    }).pipe(Effect.ignore, Effect.as(Message.CompletedShowRailDrawer())),
});

/** Closes the drawer, and puts focus back on the button that opened it when asked. */
export const HideRailDrawer = Command.define("HideRailDrawer", {
  args: {
    railId: Schema.String,
    buttonId: Schema.String,
    isReturningFocus: Schema.Boolean,
  },
  messages: [Message.CompletedHideRailDrawer],
  execute: ({ railId, buttonId, isReturningFocus }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      const rail = yield* findRail(railId);

      if (rail.matches(":popover-open")) {
        yield* Effect.try(() => {
          rail.hidePopover();
        });
      }
    }).pipe(
      Effect.ignore,
      Effect.andThen(
        isReturningFocus
          ? Dom.focus(`#${CSS.escape(buttonId)}`).pipe(Effect.ignore)
          : Effect.void
      ),
      Effect.as(Message.CompletedHideRailDrawer())
    ),
});

/** Puts focus on the rail's toggle once the rail has folded or unfolded, if focus was in the
 *  rail or on its splitter: folding takes away every control in it but the toggle, which
 *  brings it back, and the splitter with them. Focus anywhere else stays where it is. */
export const FocusRailToggle = Command.define("FocusRailToggle", {
  args: { railId: Schema.String, toggleId: Schema.String },
  messages: [Message.CompletedFocusRailToggle],
  execute: ({ railId, toggleId: buttonId }) =>
    Effect.gen(function* () {
      const rail = yield* findRail(railId);
      const active = document.activeElement;

      const isOnSplitter =
        active?.matches(
          `.rail-resize[aria-controls="${CSS.escape(railId)}"]`
        ) ?? false;

      if (rail.contains(active) || isOnSplitter) {
        yield* Dom.focus(`#${CSS.escape(buttonId)}`);
      }
    }).pipe(Effect.ignore, Effect.as(Message.CompletedFocusRailToggle())),
});

type UpdateReturn = Update.Return<Model, Message>;

const closeDrawer = (model: Model, isReturningFocus: boolean): UpdateReturn =>
  model.isOpen
    ? {
        model: modifyFields(model, { isOpen: () => false }),
        commands: [
          HideRailDrawer({
            railId: model.id,
            buttonId: openButtonId(model),
            isReturningFocus,
          }),
        ],
      }
    : { model };

const open = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { isOpen: () => true }),
  commands: [ShowRailDrawer({ railId: model.id })],
});

/** Closes the rail's drawer, focus back on its button. */
export const close = (model: Model): UpdateReturn => closeDrawer(model, true);

/** Folds or unfolds the rail from a key of the parent's: the parent flips whether it keeps the
 *  rail hidden, as it does for `ToggledRail`, and folds this in, which moves focus in the rail
 *  onto the toggle. */
export const toggle = (model: Model): UpdateReturn => ({
  model,
  commands: [FocusRailToggle({ railId: model.id, toggleId: toggleId(model) })],
});

const withResizing = (
  model: Model,
  maybeResizing: Option.Option<typeof Resizing.Type>
): Model => modifyFields(model, { maybeResizing: () => maybeResizing });

const dragTo = (model: Model, clientX: number): Model =>
  withResizing(
    model,
    Option.map(model.maybeResizing, (resizing) => ({
      ...resizing,
      width: bounded(resizing.fromWidth + clientX - resizing.pressX),
    }))
  );

/** Processes a rail Message and returns the next Model, Commands and OutMessage: a splitter let
 *  go where it changes the width, or stepped by a key, asks for the width, and the toggle asks
 *  to fold or unfold the rail. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedOpen: () => open(model),
      ClickedToggle: () => ({
        ...toggle(model),
        outMessage: OutMessage.ToggledRail(),
      }),
      PressedSplitter: ({ pointerId, clientX, width }) =>
        Option.isSome(model.maybeResizing)
          ? { model }
          : {
              model: withResizing(
                model,
                Option.some({
                  pointerId,
                  pressX: clientX,
                  fromWidth: width,
                  width,
                })
              ),
            },
      MovedSplitter: ({ clientX }) => ({ model: dragTo(model, clientX) }),
      ReleasedSplitter: ({ clientX }) =>
        Option.match(dragTo(model, clientX).maybeResizing, {
          onNone: () => ({ model }),
          onSome: ({ fromWidth, width }) => ({
            model: withResizing(model, Option.none()),
            ...(width === fromWidth
              ? {}
              : { outMessage: OutMessage.ResizedRail({ width }) }),
          }),
        }),
      CancelledSplitter: () => ({ model: withResizing(model, Option.none()) }),
      PressedEscape: () => ({ model: withResizing(model, Option.none()) }),
      PressedSplitterKey: ({ width }) => ({
        model,
        outMessage: OutMessage.ResizedRail({ width: bounded(width) }),
      }),
      ClickedClose: () => close(model),
      ClosedDrawer: () => close(model),
      BlurredDrawer: () => closeDrawer(model, false),
      WidenedPastDrawer: () => closeDrawer(model, false),
      CompletedShowRailDrawer: () => ({ model }),
      CompletedHideRailDrawer: () => ({ model }),
      CompletedFocusRailToggle: () => ({ model }),
    }
  );

type DrawerMessage =
  | typeof Message.ClosedDrawer.Type
  | typeof Message.BlurredDrawer.Type
  | typeof Message.WidenedPastDrawer.Type;

export const DRAWER_QUERY = `(max-width: ${WIDEST_DRAWER_WINDOW}px)`;

export const widthChangeMessage = (
  isDrawerWidth: boolean,
  isDrawerOpen: boolean
): Option.Option<DrawerMessage> =>
  !isDrawerWidth && isDrawerOpen
    ? Option.some(Message.WidenedPastDrawer())
    : Option.none();

export const drawerToggleMessage = (
  event: Pick<ToggleEvent, "newState">
): Option.Option<DrawerMessage> =>
  Option.liftPredicate(
    Message.ClosedDrawer(),
    () => event.newState === "closed"
  );

export const drawerFocusOutMessage = (
  rail: Element,
  event: FocusEvent,
  isDrawerOpen: boolean
): Option.Option<DrawerMessage> =>
  Option.liftPredicate(
    Message.BlurredDrawer(),
    () =>
      isDrawerOpen &&
      event.relatedTarget instanceof Node &&
      !rail.contains(event.relatedTarget)
  );

/** Follows the drawer the browser shows: the browser closing it (Escape, a press on the
 *  veil), focus leaving it while it is open, and the window growing past its width while it
 *  is open, each of which closes the rail. */
export const FollowRailDrawer = Mount.defineStream("FollowRailDrawer", {
  messages: [
    Message.ClosedDrawer,
    Message.BlurredDrawer,
    Message.WidenedPastDrawer,
  ],
  execute: ({ element }) => {
    const isDrawerOpen = (): boolean => element.matches(":popover-open");

    const fromToggle = Dom.streamFromEventFilterMap({
      target: element,
      type: "toggle",
      filterMapEvent: drawerToggleMessage,
    });

    const fromFocusOut = Dom.streamFromEventFilterMap({
      target: element,
      type: "focusout",
      filterMapEvent: (event) =>
        drawerFocusOutMessage(element, event, isDrawerOpen()),
    });

    const fromWidth = Dom.streamFromMediaQuery({
      query: DRAWER_QUERY,
      mapMatches: (isDrawerWidth) =>
        widthChangeMessage(isDrawerWidth, isDrawerOpen()),
    }).pipe(
      Stream.filter(Option.isSome),
      Stream.map(({ value }) => value)
    );

    return Stream.mergeAll([fromToggle, fromFocusOut, fromWidth], {
      concurrency: "unbounded",
    });
  },
});

const railSubscriptions = Subscription.make<Model, Message>()((entry) => ({
  resize: entry(
    { maybePointerId: Schema.Option(Schema.Finite) },
    {
      modelToDependencies: (model) => ({
        maybePointerId: Option.map(
          model.maybeResizing,
          ({ pointerId }) => pointerId
        ),
      }),
      dependenciesToStream: ({ maybePointerId }) =>
        Option.match(maybePointerId, {
          onNone: () => Stream.empty,
          onSome: (pointerId) =>
            Stream.merge(
              pointerMessages<Message>(pointerId, {
                moved: ({ clientX }) => Message.MovedSplitter({ clientX }),
                released: ({ clientX }) =>
                  Message.ReleasedSplitter({ clientX }),
                cancelled: () => Message.CancelledSplitter(),
              }),
              markDragging
            ),
        }),
    }
  ),
  escape: entry(
    { isResizing: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        isResizing: Option.isSome(model.maybeResizing),
      }),
      dependenciesToStream: ({ isResizing }) =>
        isResizing ? escapeKeys(Message.PressedEscape()) : Stream.empty,
    }
  ),
}));

/** A dragged splitter follows the pointer, and Escape puts it back before a dialog or the
 *  page sees it, from listeners that run only while it is dragged. Lift them into the
 *  application's Subscriptions behind a key prefix of the parent's: `subscriptions("rail")` is
 *  keyed `railResize` and `railEscape`. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, railSubscriptions);

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Names the rail for screen readers, and its button, drawer head and splitter
   *  (`"collections"`). */
  label: string;
  /** The width the reader gave the rail, in pixels, as the parent keeps it from `ResizedRail`
   *  (for this client: another reader's window is not this one's); none for the stylesheet's.
   *  A width out of the rail's bounds prints at the nearer bound. */
  maybeWidth: Option.Option<number>;
  /** Whether the reader folded the rail to its first panel's title bar, as the parent keeps it
   *  from `ToggledRail` (for this client, as it keeps the width). The drawer ignores it. */
  isHidden: boolean;
  /** The parent's key for the toggle, which its tip prints after its label; the parent binds
   *  it to `toggle`. */
  maybeToggleKeyHint: Option.Option<Button.KeyHintConfig>;
  /** The rail's panels: a tree, places, filters, given the toggle that folds the rail to put in
   *  its first panel's `lead`. A function because a Submodel's viewInputs may hold functions
   *  only at the top level, and Foldkit runs this one in the parent's boundary, so the
   *  handlers in what it returns dispatch the parent's Messages. */
  toAsideView: (toggle: Html) => readonly Html[];
  /** The page beside the rail, `main.deck#main` or `main.bench#main`, given the button that
   *  opens the drawer to print first in it. A function because it receives that button, and
   *  runs in the parent's boundary like `toAsideView`. */
  toDeckView: (openButton: Html) => Html;
}>;

/**
 * A column of panels beside the deck, fixed under the top bar: `div.railed >` the deck, then
 * `aside.rail[popover="auto"][aria-label]`, then its splitter, `div.rail-resize[role="separator"]`,
 * on its right edge. What comes before its last panel keeps its height, and the last panel
 * shrinks to the room left, its bar and foot staying while its body scrolls. One element
 * serves both layouts, so nothing in it renders twice or loses its state. At 900px and under it leaves the page, and
 * `span.rail-open > button.btn.small` at the top of the deck opens the same element as a drawer
 * over a veil, its head (the name and a close glyph) showing. Opening focuses its first
 * control; Escape, a press on the veil, the close glyph, focus leaving or the window growing
 * past 900px closes it, and the first three put focus back on the button.
 *
 * Its splitter sizes it, by a pointer (previewed as it moves) or the side arrows, within its
 * bounds, and reports the width as `ResizedRail` for the parent to keep and pass back as
 * `maybeWidth`, which the view sets as `--railed-width` on `div.railed`, so the page's padding
 * and the rail's width follow it (without one, `--rail`). The drawer keeps its own width. Lift
 * `subscriptions(keyPrefix)` into the application's, or a dragged splitter follows nothing.
 *
 * Its toggle, `span.rail-toggle > button.iconbtn.quiet[aria-expanded]` ("Hide <label>"), comes
 * to `toAsideView` to print as the first panel's `lead`. Pressed, it reports `ToggledRail` for
 * the parent to keep and pass back as `isHidden`: `div.railed.folded` then stands the first
 * panel's title bar on end on the ground (the toggle at its top, "Show <label>"), the rest of
 * the rail and its splitter gone, and the deck takes the width. Focus in the rail lands on the
 * toggle. The drawer, at 900px and under, prints neither the toggle nor the fold.
 *
 * Its state is its own, not `@foldkit/ui`'s Popover: that panel is placed by Floating UI and
 * rendered only while open, and this one is always in the page, placed by the stylesheet, and
 * opened as a native popover so the browser keeps it in the top layer.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, isHidden, maybeToggleKeyHint, toAsideView, toDeckView } =
      viewInputs;

    const maybeWidth = Option.orElse(
      Option.map(model.maybeResizing, ({ width }) => width),
      () => Option.map(viewInputs.maybeWidth, bounded)
    );

    const width = Option.getOrElse(maybeWidth, () => WIDTH.start);

    const openButton = h.span(
      [h.Class("rail-open")],
      [
        Button.view(
          {
            label,
            glyph: "sidebar",
            isSmall: true,
            onClick: Message.ClickedOpen(),
            attributes: [
              h.Id(openButtonId(model)),
              h.AriaExpanded(model.isOpen),
              h.AriaControls(model.id),
            ],
          },
          h
        ),
      ]
    );

    const toggleButton = h.span(
      [h.Class("rail-toggle")],
      [
        IconButton.view(
          {
            glyph: "sidebar",
            label: `${isHidden ? "Show" : "Hide"} ${label}`,
            isQuiet: true,
            onClick: Message.ClickedToggle(),
            ...Option.match(maybeToggleKeyHint, {
              onNone: () => ({}),
              onSome: (keyHint) => ({ keyHint }),
            }),
            attributes: [
              h.Id(toggleId(model)),
              h.AriaExpanded(!isHidden),
              h.AriaControls(model.id),
            ],
          },
          h
        ),
      ]
    );

    const splitter = h.div([
      h.Class("rail-resize"),
      h.Role("separator"),
      h.AriaLabel(`Width of ${label}`),
      h.AriaControls(model.id),
      h.AriaValuemin(WIDTH.leastFittingPanels),
      h.AriaValuemax(WIDTH.mostLeavingLeastDeck),
      h.AriaValuenow(width),
      h.AriaValuetext(`${width} pixels`),
      h.Tabindex(0),
      ...splitterAttributes(
        {
          orientation: "vertical",
          isIdle: Option.isNone(model.maybeResizing),
          onPress: (pointerId, clientX) =>
            Message.PressedSplitter({ pointerId, clientX, width }),
          onStep: (direction) =>
            Message.PressedSplitterKey({
              width: width + direction * WIDTH.arrowStep,
            }),
        },
        h
      ),
    ]);

    return h.div(
      [
        h.Class(isHidden ? "railed folded" : "railed"),
        ...(isHidden
          ? []
          : Array.fromOption(
              Option.map(maybeWidth, (shown) =>
                h.Style({ "--railed-width": `${shown}px` })
              )
            )),
      ],
      [
        toDeckView(openButton),
        h.aside(
          [
            h.Id(model.id),
            h.Popover("auto"),
            h.AriaLabel(label),
            h.Class("rail"),
            h.OnMount(FollowRailDrawer()),
          ],
          [
            h.div(
              [h.Class("rail-head")],
              [
                h.span([h.Class("label")], [label]),
                IconButton.view(
                  {
                    glyph: "cross",
                    label: "Close",
                    onClick: Message.ClickedClose(),
                  },
                  h
                ),
              ]
            ),
            ...toAsideView(toggleButton),
          ]
        ),
        ...(isHidden ? [] : [splitter]),
      ]
    );
  }
);
