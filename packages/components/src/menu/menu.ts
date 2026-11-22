import { Button as UiButton } from "@foldkit/ui";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Effect, Match, Option, Schema, pipe } from "effect";
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
import * as DatePicker from "../date-picker/date-picker.ts";
import { Focus } from "../focus/focus.ts";
import { isUnhandledPlainKey } from "../keys/keys.ts";
import { Item } from "./item.ts";
import { Edge, Message } from "./message.ts";
import {
  BindSlip,
  dayInputId,
  edgeSelector,
  entriesOf,
  rowsView,
} from "./slip.ts";

/** Schema for a menu: its id, whether its slip is open, which end of the slip takes focus as
 *  it opens, and whether a day row's picker is out (the slip has closed, and the day row's
 *  hidden input stays until a day is picked or the menu opens again). One Model serves one
 *  toggle: a menu on every row of a list is a Model per row, each with its own id, never one
 *  Model handed from row to row. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  edge: Edge,
  isPickingDay: Schema.Boolean,
});

export type Model = typeof Model.Type;

/** Union of OutMessages a menu reports. `Selected`: an action, a radio item or a link was
 *  chosen and the slip has closed (the browser follows a link itself). `Toggled`: a check item
 *  was chosen; the slip stays open and the parent flips the value it keeps. `PickedDay`: a
 *  day item's picker gave a day, as `YYYY-MM-DD` (`""` once cleared), and focus is back on
 *  the toggle. */
export const OutMessage = defineMessageUnion({
  Selected: { id: Schema.String },
  Toggled: { id: Schema.String },
  PickedDay: { id: Schema.String, value: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a menu with `init`. The `id` must be unique in the document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a closed menu. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  edge: "First",
  isPickingDay: false,
});

/** The menu's id, unique in the document. */
export const id = (model: Model): string => model.id;

/** Whether the slip is open: a parent pauses its own page keys while it is. */
export const isOpen = (model: Model): boolean => model.isOpen;

const toggleId = (model: Model): string => `${model.id}-toggle`;

const slipId = (model: Model): string => `${model.id}-slip`;

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
  modifyFields(model, {
    isOpen: () => true,
    edge: () => edge,
    isPickingDay: () => false,
  });

const closed = (model: Model): Model =>
  modifyFields(model, { isOpen: () => false });

const closedWithFocus = (model: Model): Update.Return<Model, Message> => ({
  model: closed(model),
  commands: [Focus({ id: toggleId(model) })],
});

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
        Match.value(kind).pipe(
          Match.withReturnType<
            Update.ReturnWithOutMessage<Model, Message, OutMessage>
          >(),
          Match.when("Check", () => ({
            model,
            outMessage: OutMessage.Toggled({ id: itemId }),
          })),
          Match.when("Day", () =>
            closedWithFocus(modifyFields(model, { isPickingDay: () => true }))
          ),
          Match.when(Match.is("Action", "Radio", "Link"), () =>
            pipe(
              closedWithFocus(model),
              Update.withOutMessage(OutMessage.Selected({ id: itemId }))
            )
          ),
          Match.exhaustive
        ),
      PressedEscape: () => closedWithFocus(model),
      PressedTab: () => closedWithFocus(model),
      BlurredSlip: () => ({ model: closed(model) }),
      UnmountedSlip: () => ({ model: closed(model) }),
      CompletedPlaceSlip: () => ({ model }),
      CompletedFocus: () => ({ model }),
      CompletedFocusEdge: () => ({ model }),
      PickedDay: ({ id: itemId, value }) => ({
        model: modifyFields(model, { isPickingDay: () => false }),
        commands: [Focus({ id: toggleId(model) })],
        outMessage: OutMessage.PickedDay({ id: itemId, value }),
      }),
      CompletedBindDayInput: () => ({ model }),
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
  isUnhandledPlainKey(event)
    ? Option.map(toggleEdge(event.key), (edge) =>
        Message.PressedToggleArrow({ edge })
      )
    : Option.none();

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

/** Which edge of the toggle the slip hangs from. */
export const Align = Schema.Literals(["Start", "End"]);

export type Align = typeof Align.Type;

export type ViewInputs = Readonly<{
  /** The toggle's accessible name, which also names the slip. Printed as its words unless
   *  `glyph` or `toggleContent` replaces them; then it is the toggle's `aria-label` and tip,
   *  so start it with any words the content shows. */
  label: string;
  items: readonly Item[];
  /** A glyph toggle (`iconbtn`): the glyph alone, `label` its name and tip. */
  glyph?: GlyphName;
  /** The toggle's own content in place of `label`'s words: a glyph, the current choice's
   *  title, a count, a caret. A small button with the menu's classes still. Markup that
   *  carries no handlers: it is built in the application's boundary and rendered inside the
   *  toggle, in this Submodel's. */
  toggleContent?: ReadonlyArray<Html | string>;
  /** The toggle's look. A button prints small: `Primary` for a page's main action, `Quiet`
   *  for a side pane's property, at body size. A glyph toggle that is `Quiet` is muted until
   *  hovered: a row's `more` menu. `Chip` prints a chip with a caret after its words or its
   *  content: an item's area or goal. */
  variant?: ToggleVariant;
  align?: Align;
}>;

/** How a menu's toggle prints: a button's variant, or a chip. */
export type ToggleVariant = Exclude<Variant, "Danger"> | "Chip";

/** A day row's hidden input's Mount: the same work as a PropsList date's (`bindPicker`),
 *  named apart from `BindDatePicker` because a Scene tells Mounts apart by name and order. A
 *  Scene resolves each by name, whatever dates are on the page:
 *  `Scene.Mount.resolve(Menu.BindDayInput, Menu.Message.CompletedBindDayInput())`, the menu's
 *  own Message, which the Scene lifts through the menu's submodel. */
export const BindDayInput = Mount.define("BindDayInput", {
  messages: [Message.CompletedBindDayInput],
  execute: DatePicker.bindPicker(Message.CompletedBindDayInput()),
});

const dayInputsView = (
  model: Model,
  items: readonly Item[],
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Array.map(Array.filter(entriesOf(items), Item.$is("Day")), (day) =>
    DatePicker.inputView(
      {
        id: dayInputId(slipId(model), day.id),
        value: day.value,
        onChange: (value) => Message.PickedDay({ id: day.id, value }),
        mount: BindDayInput(),
      },
      h
    )
  );

const isNamedByLabel = (viewInputs: ViewInputs): boolean =>
  viewInputs.glyph !== undefined || viewInputs.toggleContent !== undefined;

const toggleClass = (viewInputs: ViewInputs): string => {
  const { glyph, toggleContent, variant = "Default" } = viewInputs;

  if (variant === "Chip") {
    return "gg-chip";
  }

  if (glyph === undefined || toggleContent !== undefined) {
    return lookClassName({ variant, isSmall: true });
  }

  return variant === "Quiet" ? "gg-iconbtn gg-quiet" : "gg-iconbtn";
};

const toggleView = (
  model: Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): Html => {
  const { label, glyph, toggleContent, variant } = viewInputs;

  const content =
    toggleContent ??
    (glyph === undefined ? [label] : [Glyph.view({ name: glyph }, h)]);

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
              ? [h.AriaLabel(label), h.DataAttribute("gg-tip", label)]
              : []),
            h.OnMount(BindToggleKeys()),
            h.Class(toggleClass(viewInputs)),
          ],
          variant === "Chip"
            ? [...content, Glyph.view({ name: "caret-down" }, h)]
            : content
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
 *
 * Built beside `@foldkit/ui`'s Menu, which has no radio, check or link rows and closes on
 * every choice.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, items, align = "Start" } = viewInputs;

    return h.div(
      [h.Class("gg-menu-wrap")],
      [
        toggleView(model, viewInputs, h),
        ...(model.isOpen || model.isPickingDay
          ? dayInputsView(model, items, h)
          : []),
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
                  h.Class("gg-menu"),
                ],
                rowsView({ slipId: slipId(model), items }, h)
              ),
            ]
          : []),
      ]
    );
  }
);
