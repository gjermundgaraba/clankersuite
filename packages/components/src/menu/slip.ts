import { Anchor, Button as UiButton } from "@foldkit/ui";
import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Queue,
  Schema,
  Stream,
  String,
  pipe,
} from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import * as Mount from "foldkit/mount";

import type { Attributes } from "../attributes/attributes.ts";
import type { KeyHintConfig } from "../button/button.ts";
import * as KeyHint from "../key-hint/key-hint.ts";
import { isPlain } from "../keys/keys.ts";
import { Item } from "./item.ts";
import type { Entry } from "./item.ts";
import { Edge, Message } from "./message.ts";

const ITEM_SELECTOR = '[role^="menuitem"]';
const FIRST_ATTRIBUTE = "data-gg-slip-first";
const LAST_ATTRIBUTE = "data-gg-slip-last";

export const edgeSelector = (edge: Edge): string =>
  edge === "First" ? `[${FIRST_ATTRIBUTE}]` : `[${LAST_ATTRIBUTE}]`;

const isGroup = Item.$is("Group");

const entriesOf = (items: readonly Item[]): readonly Entry[] =>
  Array.flatMap(items, (item) => (isGroup(item) ? item.items : [item]));

const entryIds = (items: readonly Item[]): readonly string[] =>
  Array.map(entriesOf(items), (entry) => entry.id);

type RowContext = Readonly<{
  maybeFirstId: Option.Option<string>;
  maybeLastId: Option.Option<string>;
}>;

const edgeAttributes = (
  context: RowContext,
  id: string,
  h: HtmlBuilder<Message>
) => [
  ...(Option.contains(context.maybeFirstId, id)
    ? [h.Attribute(FIRST_ATTRIBUTE, "")]
    : []),
  ...(Option.contains(context.maybeLastId, id)
    ? [h.Attribute(LAST_ATTRIBUTE, "")]
    : []),
];

const wordsView = (
  entry: Readonly<{
    label: string;
    keyHint?: KeyHintConfig;
  }>,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  h.span([h.Class("gg-menu-label")], [entry.label]),
  ...(entry.keyHint === undefined ? [] : [KeyHint.view(entry.keyHint, h)]),
];

const buttonRowView = (
  config: Readonly<{
    entry: Exclude<Entry, Readonly<{ _tag: "Link" }>>;
    isDisabled: boolean;
    attributes: Attributes<Message>;
    children: readonly Html[];
  }>,
  context: RowContext,
  h: HtmlBuilder<Message>
): Html => {
  const { entry, isDisabled, attributes, children } = config;

  return UiButton.view(
    {
      onClick: Message.SelectedItem({ id: entry.id, kind: entry._tag }),
      isDisabled,
      toView: (groups) =>
        h.keyed("button")(
          entry.id,
          [
            ...groups.button,
            ...attributes,
            h.Tabindex(-1),
            ...edgeAttributes(context, entry.id, h),
          ],
          children
        ),
    },
    h
  );
};

const entryView = (
  entry: Entry,
  context: RowContext,
  h: HtmlBuilder<Message>
): Html =>
  Match.valueTags(entry, {
    Action: (action) =>
      buttonRowView(
        {
          entry: action,
          isDisabled: action.isDisabled === true,
          attributes: [h.Role("menuitem")],
          children: wordsView(action, h),
        },
        context,
        h
      ),
    Radio: (radio) =>
      buttonRowView(
        {
          entry: radio,
          isDisabled: false,
          attributes: [h.Role("menuitemradio"), h.AriaChecked(radio.isChecked)],
          children: wordsView(radio, h),
        },
        context,
        h
      ),
    Check: (check) =>
      buttonRowView(
        {
          entry: check,
          isDisabled: false,
          attributes: [
            h.Role("menuitemcheckbox"),
            h.AriaChecked(check.isChecked),
          ],
          children: [
            h.span([h.Class("gg-menu-check"), h.AriaHidden(true)]),
            h.span([h.Class("gg-menu-label")], [check.label]),
          ],
        },
        context,
        h
      ),
    Link: (link) =>
      h.keyed("a")(
        link.id,
        [
          h.Role("menuitem"),
          h.Href(link.href),
          h.Tabindex(-1),
          h.OnClick(Message.SelectedItem({ id: link.id, kind: link._tag })),
          ...edgeAttributes(context, link.id, h),
        ],
        wordsView(link, h)
      ),
  });

export const rowsView = (
  config: Readonly<{ slipId: string; items: readonly Item[] }>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const ids = entryIds(config.items);

  const context: RowContext = {
    maybeFirstId: Array.head(ids),
    maybeLastId: Array.last(ids),
  };

  return Array.map(config.items, (item, index) => {
    if (!isGroup(item)) {
      return entryView(item, context, h);
    }

    const headingId = `${config.slipId}-group-${index}`;

    return h.keyed("div")(
      `group:${item.label}`,
      [h.Role("group"), h.AriaLabelledBy(headingId)],
      [
        h.span(
          [h.Id(headingId), h.Class("gg-menu-note"), h.Role("none")],
          [item.label]
        ),
        ...Array.map(item.items, (entry) => entryView(entry, context, h)),
      ]
    );
  });
};

const itemsOf = (slip: Element): readonly HTMLElement[] =>
  Array.fromIterable(slip.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

const focusedIndex = (items: readonly HTMLElement[]): Option.Option<number> =>
  Array.findFirstIndex(items, (item) => item === document.activeElement);

const focusAt = (items: readonly HTMLElement[], index: number): boolean =>
  Option.match(Array.get(items, index), {
    onNone: () => false,
    onSome: (item) => {
      item.focus();

      return true;
    },
  });

const wrap = (index: number, length: number): number =>
  (index + length) % length;

const startsWith = (item: HTMLElement, key: string): boolean =>
  pipe(
    item.textContent ?? "",
    String.trim,
    String.toLowerCase,
    String.startsWith(String.toLowerCase(key))
  );

const typeahead = (items: readonly HTMLElement[], key: string): boolean => {
  const start = Option.match(focusedIndex(items), {
    onNone: () => 0,
    onSome: Number.increment,
  });

  const ordered = [...Array.drop(items, start), ...Array.take(items, start)];

  return Option.match(
    Array.findFirst(ordered, (item) => startsWith(item, key)),
    {
      onNone: () => false,
      onSome: (item) => {
        item.focus();

        return true;
      },
    }
  );
};

const isShiftTab = (event: KeyboardEvent): boolean =>
  event.key === "Tab" &&
  event.shiftKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey;

type SlipMessage =
  | typeof Message.CompletedPlaceSlip.Type
  | typeof Message.PressedEscape.Type
  | typeof Message.PressedTab.Type
  | typeof Message.BlurredSlip.Type;

const handleSlipKey = (
  slip: Element,
  event: KeyboardEvent
): Option.Option<SlipMessage> => {
  if (
    event.isComposing ||
    event.defaultPrevented ||
    !(isPlain(event) || isShiftTab(event))
  ) {
    return Option.none();
  }

  const items = itemsOf(slip);
  const { length } = items;
  const maybeCurrent = focusedIndex(items);

  const below = Option.match(maybeCurrent, {
    onNone: () => 0,
    onSome: Number.increment,
  });

  const above = Option.match(maybeCurrent, {
    onNone: () => length - 1,
    onSome: Number.decrement,
  });

  const moved = (didMove: boolean): Option.Option<SlipMessage> => {
    if (didMove) {
      event.preventDefault();
    }

    return Option.none();
  };

  const reported = (message: SlipMessage): Option.Option<SlipMessage> => {
    event.preventDefault();

    return Option.some(message);
  };

  return Match.value(event.key).pipe(
    Match.withReturnType<Option.Option<SlipMessage>>(),
    Match.when("ArrowDown", () =>
      moved(length > 0 && focusAt(items, wrap(below, length)))
    ),
    Match.when("ArrowUp", () =>
      moved(length > 0 && focusAt(items, wrap(above, length)))
    ),
    Match.when("Home", () => moved(focusAt(items, 0))),
    Match.when("End", () => moved(focusAt(items, length - 1))),
    Match.when("Escape", () => reported(Message.PressedEscape())),
    Match.when("Tab", () => reported(Message.PressedTab())),
    Match.when(
      (key) => key.length === 1 && key !== " ",
      (key) => moved(typeahead(items, key))
    ),
    Match.orElse(() => Option.none())
  );
};

const isLeaving = (slip: Element, next: EventTarget | null, toggleId: string) =>
  !(next instanceof Node && slip.contains(next)) &&
  !(next instanceof Element && next.id === toggleId);

const preventMouseDown = (event: Event): void => {
  event.preventDefault();
};

const GAP = 6;
const WINDOW_PADDING = 12;

/** The open slip: hung under the toggle by `@foldkit/ui`'s Anchor (portaled, into the dialog
 *  when inside one), focus on its first or last row (`edge`), and its keys (see
 *  `handleSlipKey`). Focus moving to the toggle is not leaving. A press inside the slip keeps
 *  focus where it is, so a click on a row reaches it in every browser. It reports
 *  `CompletedPlaceSlip` once set up; in a Scene, resolve it with that. */
export const BindSlip = Mount.defineStream("BindSlip", {
  args: { toggleId: Schema.String, isEnd: Schema.Boolean, edge: Edge },
  messages: [
    Message.CompletedPlaceSlip,
    Message.PressedEscape,
    Message.PressedTab,
    Message.BlurredSlip,
  ],
  execute: ({ element, toggleId, isEnd, edge }) =>
    Stream.callback<SlipMessage>((queue) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const cleanup = Anchor.anchorSetup(element, {
              buttonId: toggleId,
              anchor: {
                placement: isEnd ? "bottom-end" : "bottom-start",
                gap: GAP,
                padding: WINDOW_PADDING,
              },
              interceptTab: false,
              focusAfterPosition: true,
              focusSelector: edgeSelector(edge),
            });

            const onKeyDown = (event: Event): void => {
              if (!(event instanceof KeyboardEvent)) {
                return;
              }

              const maybeMessage = handleSlipKey(element, event);

              if (Option.isSome(maybeMessage)) {
                Queue.offerUnsafe(queue, maybeMessage.value);
              }
            };

            const onFocusOut = (event: Event): void => {
              if (
                event instanceof FocusEvent &&
                isLeaving(element, event.relatedTarget, toggleId)
              ) {
                Queue.offerUnsafe(queue, Message.BlurredSlip());
              }
            };

            element.addEventListener("keydown", onKeyDown);
            element.addEventListener("focusout", onFocusOut);
            element.addEventListener("mousedown", preventMouseDown);

            return () => {
              element.removeEventListener("keydown", onKeyDown);
              element.removeEventListener("focusout", onFocusOut);
              element.removeEventListener("mousedown", preventMouseDown);
              cleanup();
            };
          }),
          (teardown) => Effect.sync(teardown)
        );
        Queue.offerUnsafe(queue, Message.CompletedPlaceSlip());

        return yield* Effect.never;
      })
    ),
});
