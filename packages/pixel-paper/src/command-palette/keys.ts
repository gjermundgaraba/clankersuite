import { Match, Option, Stream } from "effect";
import * as Dom from "foldkit/dom";
import * as Mount from "foldkit/mount";

import { isPlain } from "../keys/keys.ts";
import { Message } from "./message.ts";

export const OPTION_SELECTOR = '[role="option"]';

export const FIELD_ATTRIBUTE = "pixel-paper-palette-field";

export const PAGE_ATTRIBUTE = "pixel-paper-palette-page";

export const shownPageOf = (element: Element): Option.Option<string> =>
  Option.fromNullishOr(element.getAttribute(`data-${PAGE_ATTRIBUTE}`));

const isEmptyFieldOnPage = (root: Element, field: Element): boolean =>
  field instanceof HTMLInputElement &&
  field.value === "" &&
  Option.isSome(shownPageOf(root));

const isComposingModifiedOrHandled = (event: KeyboardEvent): boolean =>
  event.isComposing || !isPlain(event) || event.defaultPrevented;

export const fieldKey = (
  root: Element,
  event: KeyboardEvent
): Option.Option<typeof Message.PressedBackspace.Type> => {
  const field = root.querySelector(`[data-${FIELD_ATTRIBUTE}]`);

  if (
    field === null ||
    event.target !== field ||
    event.key !== "Backspace" ||
    isComposingModifiedOrHandled(event) ||
    !isEmptyFieldOnPage(root, field)
  ) {
    return Option.none();
  }

  return Option.some(
    Message.PressedBackspace({ maybeShownPage: shownPageOf(root) })
  );
};

export const composingKey = (event: KeyboardEvent): Option.Option<never> => {
  if (event.isComposing) {
    event.stopPropagation();
  }

  return Option.none();
};

export const rowPress = (event: MouseEvent): Option.Option<never> => {
  if (
    event.target instanceof Element &&
    event.target.closest(OPTION_SELECTOR) !== null
  ) {
    event.preventDefault();
  }

  return Option.none();
};

/** What the palette's card needs of the document as it is at the event: Backspace in an empty
 *  field on a page goes back (its default prevented), a key an IME is composing never reaches
 *  the field's handler, and a press on a row keeps focus in the field, so a refused pick
 *  leaves it there. The arrows and Enter are the field's own handler's, in the view, which
 *  knows the rows. Escape is the Dialog's: it closes the whole palette. In a Scene, resolve it
 *  with `Message.PressedBackspace`. */
export const BindPaletteKeys = Mount.defineStream("BindPaletteKeys", {
  messages: [Message.PressedBackspace],
  execute: ({ element }) =>
    Stream.mergeAll(
      [
        Dom.streamFromEventFilterMap({
          target: element,
          type: "keydown",
          options: { capture: true },
          filterMapEvent: composingKey,
        }),
        Dom.streamFromEventFilterMapPreventDefault({
          target: element,
          type: "keydown",
          filterMapEvent: (event) => fieldKey(element, event),
        }),
        Dom.streamFromEventFilterMap({
          target: element,
          type: "mousedown",
          filterMapEvent: rowPress,
        }),
      ],
      { concurrency: "unbounded" }
    ),
});

type EarlyKeyMessage =
  | typeof Message.PressedEarlyArrowKey.Type
  | typeof Message.PressedEarlyEnter.Type;

const isInsidePalette = (paletteId: string, event: KeyboardEvent): boolean =>
  Option.exists(
    Option.fromNullishOr(document.querySelector(`#${CSS.escape(paletteId)}`)),
    (dialog) => event.target instanceof Node && dialog.contains(event.target)
  );

const earlyKeyMessageOf = (key: string): Option.Option<EarlyKeyMessage> =>
  Match.value(key).pipe(
    Match.withReturnType<Option.Option<EarlyKeyMessage>>(),
    Match.whenOr("ArrowDown", "ArrowUp", (arrow) =>
      Option.some(Message.PressedEarlyArrowKey({ key: arrow }))
    ),
    Match.when("Enter", () => Option.some(Message.PressedEarlyEnter())),
    Match.orElse(() => Option.none())
  );

export const earlyKey = (
  paletteId: string,
  event: KeyboardEvent
): Option.Option<EarlyKeyMessage> => {
  if (
    isInsidePalette(paletteId, event) ||
    isComposingModifiedOrHandled(event)
  ) {
    return Option.none();
  }

  const maybeMessage = earlyKeyMessageOf(event.key);

  if (Option.isSome(maybeMessage)) {
    event.preventDefault();
    event.stopPropagation();
  }

  return maybeMessage;
};

export const earlyKeys = (paletteId: string): Stream.Stream<Message> =>
  Dom.streamFromEventFilterMap({
    target: () => window,
    type: "keydown",
    options: { capture: true },
    filterMapEvent: (event) => earlyKey(paletteId, event),
  });
