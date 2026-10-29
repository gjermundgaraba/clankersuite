import { Button as UiButton } from "@foldkit/ui";
import { Effect, Match, Option, Schema, pipe } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { lookClassName } from "../button/button.ts";
import type { Variant } from "../button/button.ts";
import { Focus } from "../focus/focus.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import { isPlain } from "../keys/keys.ts";
import type { Item } from "./item.ts";
import {
  ChoiceKind,
  Edge,
  anchorUnder,
  edgeSelector,
  rowsView,
  slipStream,
} from "./slip.ts";

/** Schema for a menu: its id, whether its slip is open, and which end of the slip takes
 *  focus as it opens. One Model serves one toggle: a menu on every row of a list is a Model
 *  per row, each with its own id, never one Model handed from row to row. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  edge: Edge,
});

export type Model = typeof Model.Type;

/** Union of all Messages a menu can produce. `LeftSlip` (focus went outside the slip),
 *  `UnmountedSlip` (the slip left the page) and `CompletedFocus` (focus is back on the
 *  toggle) can arrive after the menu has closed. Each must reach the Model of the menu that
 *  sent it, where a late one changes nothing: given to another menu's Model, a late `LeftSlip`
 *  or `UnmountedSlip` closes that one. */
export const Message = defineMessageUnion({
  ClickedToggle: {},
  PressedToggleArrow: { edge: Edge },
  SelectedItem: { id: Schema.String, kind: ChoiceKind },
  PressedEscape: {},
  PressedTab: {},
  LeftSlip: {},
  UnmountedSlip: {},
  CompletedPlaceSlip: {},
  CompletedFocus: {},
  CompletedFocusEdge: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages a menu reports. `Selected`: an action, a radio item or a link was
 *  chosen and the slip has closed (the browser follows a link itself). `Toggled`: a check item
 *  was chosen; the slip stays open and the parent flips the value it keeps. */
export const OutMessage = defineMessageUnion({
  Selected: { id: Schema.String },
  Toggled: { id: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a menu with `init`. The `id` must be unique in the document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a closed menu. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  edge: "First",
});

/** The menu's id, unique in the document. */
export const id = (model: Model): string => model.id;

/** Whether the slip is open: a parent pauses its own page keys while it is. */
export const isOpen = (model: Model): boolean => model.isOpen;

const toggleId = (model: Model): string => `${model.id}-toggle`;

const slipId = (model: Model): string => `${model.id}-slip`;

/** Moves focus to an end of the open slip (↓ or ↑ on the toggle while it is open). */
export const FocusEdge = Command.define("FocusEdge", {
  args: { slipId: Schema.String, edge: Edge },
  messages: [Message.CompletedFocusEdge],
  execute: ({ slipId: openSlipId, edge }) =>
    Dom.focus(`#${CSS.escape(openSlipId)} ${edgeSelector(edge)}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusEdge())
    ),
});

const opened = (model: Model, edge: Edge): Model =>
  modifyFields(model, { isOpen: () => true, edge: () => edge });

const closed = (model: Model): Model =>
  modifyFields(model, { isOpen: () => false });

const closedWithFocus = (model: Model): Update.Return<Model, Message> => ({
  model: closed(model),
  commands: [Focus({ id: toggleId(model) })],
});

/** Processes a menu Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedToggle: () => ({
        model: model.isOpen ? closed(model) : opened(model, "First"),
      }),
      PressedToggleArrow: ({ edge }) =>
        model.isOpen
          ? { model, commands: [FocusEdge({ slipId: slipId(model), edge })] }
          : { model: opened(model, edge) },
      SelectedItem: ({ id: itemId, kind }) =>
        kind === "Check"
          ? { model, outMessage: OutMessage.Toggled({ id: itemId }) }
          : pipe(
              closedWithFocus(model),
              Update.withOutMessage(OutMessage.Selected({ id: itemId }))
            ),
      PressedEscape: () => closedWithFocus(model),
      PressedTab: () => closedWithFocus(model),
      LeftSlip: () => ({ model: closed(model) }),
      UnmountedSlip: () => ({ model: closed(model) }),
      CompletedPlaceSlip: () => ({ model }),
      CompletedFocus: () => ({ model }),
      CompletedFocusEdge: () => ({ model }),
    }
  );

const toggleEdge = (key: string): Option.Option<Edge> =>
  Match.value(key).pipe(
    Match.withReturnType<Option.Option<Edge>>(),
    Match.when("ArrowDown", () => Option.some("First")),
    Match.when("ArrowUp", () => Option.some("Last")),
    Match.orElse(() => Option.none())
  );

export const toggleKey = (
  event: KeyboardEvent
): Option.Option<typeof Message.PressedToggleArrow.Type> =>
  event.isComposing || event.defaultPrevented || !isPlain(event)
    ? Option.none()
    : Option.map(toggleEdge(event.key), (edge) =>
        Message.PressedToggleArrow({ edge })
      );

/** ↓ and ↑ on the toggle open the slip on its first or last row (Enter and Space click it),
 *  their default prevented (see `toggleKey`). In a Scene, resolve it with
 *  `Message.PressedToggleArrow`. */
export const BindToggleKeys = Mount.defineStream("BindToggleKeys", {
  messages: [Message.PressedToggleArrow],
  execute: ({ element }) =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: element,
      type: "keydown",
      filterMapEvent: toggleKey,
    }),
});

type SlipMessage =
  | typeof Message.CompletedPlaceSlip.Type
  | typeof Message.PressedEscape.Type
  | typeof Message.PressedTab.Type
  | typeof Message.LeftSlip.Type;

/** The open slip: hung under the toggle by `@foldkit/ui`'s Anchor (portaled, into the dialog
 *  when inside one), focus on its first or last row, and its keys (see `handleSlipKey`). It
 *  reports `CompletedPlaceSlip` once set up; in a Scene, resolve it with that. */
export const BindSlip = Mount.defineStream("BindSlip", {
  args: { toggleId: Schema.String, isEnd: Schema.Boolean, edge: Edge },
  messages: [
    Message.CompletedPlaceSlip,
    Message.PressedEscape,
    Message.PressedTab,
    Message.LeftSlip,
  ],
  execute: ({ element, toggleId: slipToggleId, isEnd, edge }) =>
    slipStream<SlipMessage>(element, {
      placed: Message.CompletedPlaceSlip(),
      events: {
        escape: Message.PressedEscape(),
        tab: Message.PressedTab(),
        left: Message.LeftSlip(),
      },
      keepId: Option.some(slipToggleId),
      setup: anchorUnder({ toggleId: slipToggleId, isEnd, edge }),
    }),
});

/** Which edge of the toggle the slip hangs from. */
export const Align = Schema.Literals(["Start", "End"]);

export type Align = typeof Align.Type;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** The toggle's accessible name, which also names the slip. Printed as its words unless
   *  `glyph` or `toggleContent` replaces them; then it is the toggle's `aria-label` and tip,
   *  so start it with any words the content shows. */
  label: string;
  items: readonly Item[];
  /** A glyph toggle (`iconbtn`): the glyph alone, `label` its name and tip. */
  glyph?: GlyphName;
  /** A glyph toggle muted until hovered: a row's `more` menu. */
  isQuiet?: boolean;
  /** The toggle's own content in place of `label`'s words: a glyph, the current choice's
   *  title, a count, a caret. A small button with the menu's classes still. Markup that
   *  carries no handlers: it is built in the application's boundary and rendered inside the
   *  toggle, in this Submodel's. */
  toggleContent?: ReadonlyArray<Html | string>;
  /** The toggle's look when it is a button (`Primary` for a page's main action). */
  variant?: Exclude<Variant, "Danger">;
  align?: Align;
}>;

const isNamedByLabel = (viewInputs: ViewInputs): boolean =>
  viewInputs.glyph !== undefined || viewInputs.toggleContent !== undefined;

const toggleClass = (viewInputs: ViewInputs): string => {
  const {
    glyph,
    isQuiet = false,
    toggleContent,
    variant = "Default",
  } = viewInputs;

  if (glyph === undefined || toggleContent !== undefined) {
    return lookClassName({ variant, isSmall: true });
  }

  return isQuiet ? "iconbtn quiet" : "iconbtn";
};

const toggleView = (
  model: Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): Html => {
  const { label, glyph, toggleContent } = viewInputs;

  return UiButton.view(
    {
      onClick: Message.ClickedToggle(),
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            h.Id(toggleId(model)),
            h.AriaHasPopup("menu"),
            h.AriaExpanded(model.isOpen),
            ...(model.isOpen ? [h.AriaControls(slipId(model))] : []),
            ...(isNamedByLabel(viewInputs)
              ? [h.AriaLabel(label), h.DataAttribute("tip", label)]
              : []),
            h.OnMount(BindToggleKeys()),
            h.Class(toggleClass(viewInputs)),
          ],
          toggleContent ??
            (glyph === undefined ? [label] : [Glyph.view({ name: glyph }, h)])
        ),
    },
    h
  );
};

/**
 * A printed slip under its toggle. The toggle is a button, built on `@foldkit/ui`'s Button,
 * with `aria-haspopup="menu"` and `aria-expanded`; the slip is `role="menu"` named by the
 * toggle, hung under it above the page (inside the open dialog when there is one), flipping
 * near the window edge. Its rows
 * take real focus: the first as it opens (the last on ↑), ↑ and ↓ move and wrap, Home and End
 * go to the ends, a letter goes to the row it starts, and unavailable rows are stopped on.
 * Enter, Space or a click chooses; Escape or Tab closes and puts focus back on the toggle; a
 * click elsewhere closes it, and so does the slip leaving the page while open (the row the menu
 * sits on is gone). Radio and check rows say `aria-checked`, a link to the current page
 * `aria-current`. A check row keeps the slip open. The menu does not trap focus, so it
 * hosts no live region.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, items, align = "Start" } = viewInputs;

    return h.div(
      [h.Class("menu-wrap")],
      [
        toggleView(model, viewInputs, h),
        ...(model.isOpen
          ? [
              h.div(
                [
                  h.Id(slipId(model)),
                  h.Role("menu"),
                  isNamedByLabel(viewInputs)
                    ? h.AriaLabel(label)
                    : h.AriaLabelledBy(toggleId(model)),
                  h.OnMount(
                    BindSlip({
                      toggleId: toggleId(model),
                      isEnd: align === "End",
                      edge: model.edge,
                    })
                  ),
                  h.OnUnmount(Message.UnmountedSlip()),
                  h.Class("menu"),
                ],
                rowsView(
                  {
                    slipId: slipId(model),
                    items,
                    toChoose: (itemId, kind) =>
                      Message.SelectedItem({ id: itemId, kind }),
                  },
                  h
                )
              ),
            ]
          : []),
      ]
    );
  }
);
