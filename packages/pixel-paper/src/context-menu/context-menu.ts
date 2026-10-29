import { Array, Option, Schema, pipe } from "effect";
import * as Dom from "foldkit/dom";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { Focus } from "../focus/focus.ts";
import type { Item } from "../menu/item.ts";
import {
  ChoiceKind,
  Point,
  placeAt,
  rowsView,
  slipStream,
} from "../menu/slip.ts";

const Opening = Schema.Struct({
  point: Point,
  targetId: Schema.String,
  maybeReturnFocusId: Schema.Option(Schema.String),
});

/** Schema for a context menu: its id, and the opening while its slip is open. One context
 *  menu serves every target that spreads `target` with it. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeOpening: Schema.Option(Opening),
});

export type Model = typeof Model.Type;

/** Union of all Messages a context menu can produce. */
export const Message = defineMessageUnion({
  RequestedMenu: {
    point: Point,
    targetId: Schema.String,
    maybeReturnFocusId: Schema.Option(Schema.String),
  },
  SelectedItem: { id: Schema.String, kind: ChoiceKind },
  PressedEscape: {},
  PressedTab: {},
  LeftSlip: {},
  UnmountedSlip: { targetId: Schema.String, point: Point },
  CompletedPlaceSlip: {},
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages a context menu reports, each with the target it opened for.
 *  `Selected`: an action, a radio item or a link was chosen and the slip has closed.
 *  `Toggled`: a check item was chosen; the slip stays open. */
export const OutMessage = defineMessageUnion({
  Selected: { id: Schema.String, targetId: Schema.String },
  Toggled: { id: Schema.String, targetId: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a context menu with `init`. The `id` must be unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a closed context menu. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeOpening: Option.none(),
});

/** The context menu's id, unique in the document. */
export const id = (model: Model): string => model.id;

/** The target the open slip is about. */
export const targetId = (model: Model): Option.Option<string> =>
  Option.map(model.maybeOpening, (opening) => opening.targetId);

const slipId = (model: Model): string => `${model.id}-slip`;

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const closed = (model: Model): Model =>
  modifyFields(model, { maybeOpening: () => Option.none() });

const closedWithFocus = (model: Model): Update.Return<Model, Message> => ({
  model: closed(model),
  commands: pipe(
    model.maybeOpening,
    Option.flatMap((opening) => opening.maybeReturnFocusId),
    Option.map((returnId) => Focus({ id: returnId })),
    Array.fromOption
  ),
});

const chosen = (model: Model, itemId: string, kind: ChoiceKind): UpdateReturn =>
  Option.match(targetId(model), {
    onNone: () => ({ model }),
    onSome: (target) =>
      kind === "Check"
        ? {
            model,
            outMessage: OutMessage.Toggled({ id: itemId, targetId: target }),
          }
        : pipe(
            closedWithFocus(model),
            Update.withOutMessage(
              OutMessage.Selected({ id: itemId, targetId: target })
            )
          ),
  });

/** Processes a context menu Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    RequestedMenu: ({ point, targetId: target, maybeReturnFocusId }) => ({
      model: modifyFields(model, {
        maybeOpening: () =>
          Option.some({ point, targetId: target, maybeReturnFocusId }),
      }),
    }),
    SelectedItem: ({ id: itemId, kind }) => chosen(model, itemId, kind),
    PressedEscape: () => closedWithFocus(model),
    PressedTab: () => closedWithFocus(model),
    LeftSlip: () => ({ model: closed(model) }),
    UnmountedSlip: ({ targetId: target, point }) =>
      Option.exists(
        model.maybeOpening,
        (opening) =>
          opening.targetId === target &&
          opening.point.x === point.x &&
          opening.point.y === point.y
      )
        ? { model: closed(model) }
        : { model },
    CompletedPlaceSlip: () => ({ model }),
    CompletedFocus: () => ({ model }),
  });

const isFromKeyboard = (event: MouseEvent): boolean => event.button !== 2;

const pointOf = (event: MouseEvent, element: Element): Point => {
  if (isFromKeyboard(event)) {
    const rect = element.getBoundingClientRect();

    return { x: rect.left, y: rect.bottom };
  }

  return { x: event.clientX, y: event.clientY };
};

const activeId = (): Option.Option<string> =>
  Option.filter(
    Option.map(
      Option.fromNullishOr(document.activeElement),
      (element) => element.id
    ),
    (elementId) => elementId !== ""
  );

export const menuRequest = (
  element: Element,
  requestingId: string,
  event: MouseEvent
): Option.Option<typeof Message.RequestedMenu.Type> =>
  event.defaultPrevented
    ? Option.none()
    : Option.some(
        Message.RequestedMenu({
          point: pointOf(event, element),
          targetId: requestingId,
          maybeReturnFocusId: activeId(),
        })
      );

/** Listens on a target for the context menu (a right click, the context menu key, Shift+F10)
 *  and asks for the slip: where the pointer is, or under the target when the keyboard asked.
 *  It keeps the browser's own menu shut, leaves an event someone already handled alone, and
 *  notes the focused element's id so focus can go back to it. In a Scene, resolve it with
 *  `Message.RequestedMenu`. */
export const OpenOnContextMenu = Mount.defineStream("OpenOnContextMenu", {
  args: { targetId: Schema.String },
  messages: [Message.RequestedMenu],
  execute: ({ element, targetId: target }) =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: element,
      type: "contextmenu",
      filterMapEvent: (event) => menuRequest(element, target, event),
    }),
});

/** Configuration for `target`. */
export type TargetConfig<ParentMessage> = Readonly<{
  /** Which thing this is (a row's id): reported back with the choice. */
  targetId: string;
  /** Lifts the context menu's Message into the parent's, as `h.submodel`'s
   *  `toParentMessage` does. */
  toParentMessage: (message: Message) => ParentMessage;
}>;

/** The attribute a target spreads (a row, a card, an `<li>`, a `<tr>`): its context menu opens
 *  this slip for it. Give the focusable target an id, so focus returns to it. */
export const target = <ParentMessage>(
  config: TargetConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Attribute<ParentMessage> =>
  h.OnMount(
    Mount.mapMessage(
      OpenOnContextMenu({ targetId: config.targetId }),
      config.toParentMessage
    )
  );

type SlipMessage =
  | typeof Message.CompletedPlaceSlip.Type
  | typeof Message.PressedEscape.Type
  | typeof Message.PressedTab.Type
  | typeof Message.LeftSlip.Type;

/** The open slip at its point: portaled, kept inside the window, focus on its first row, and
 *  the slip's keys. It reports `CompletedPlaceSlip` once set up; in a Scene, resolve it with
 *  that. */
export const BindPointSlip = Mount.defineStream("BindPointSlip", {
  args: { point: Point },
  messages: [
    Message.CompletedPlaceSlip,
    Message.PressedEscape,
    Message.PressedTab,
    Message.LeftSlip,
  ],
  execute: ({ element, point }) =>
    slipStream<SlipMessage>(element, {
      placed: Message.CompletedPlaceSlip(),
      events: {
        escape: Message.PressedEscape(),
        tab: Message.PressedTab(),
        left: Message.LeftSlip(),
      },
      keepId: Option.none(),
      setup: placeAt(point),
    }),
});

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Names the menu for screen readers (`"Item actions"`). */
  label: string;
  /** The same items as the target's visible Menu; read the open target with `targetId`. */
  items: readonly Item[];
}>;

/**
 * The menu of the thing under the pointer: the same slip as a Menu, opened where a right click
 * lands (under the target for the context menu key), kept 12px inside the window. It is a
 * shortcut: every item in it is also in the thing's visible Menu, which is how a phone and
 * the Tab key reach them. Render it once, anywhere (it moves to the page's top layer as it
 * opens), and spread `target` on each thing it serves. Escape, Tab or a choice put focus back
 * where it was; a slip that leaves the page while open closes.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, items } = viewInputs;

    return Option.match(model.maybeOpening, {
      onNone: () => h.empty,
      onSome: ({ point, targetId: openedFor }) =>
        h.keyed("div")(
          `${openedFor}@${point.x},${point.y}`,
          [
            h.Id(slipId(model)),
            h.Role("menu"),
            h.AriaLabel(label),
            h.OnMount(BindPointSlip({ point })),
            h.OnUnmount(Message.UnmountedSlip({ targetId: openedFor, point })),
            h.Class("menu at-point"),
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
    });
  }
);
