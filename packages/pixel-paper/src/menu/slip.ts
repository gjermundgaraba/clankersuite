import { Anchor, Button as UiButton } from "@foldkit/ui";
import {
  Array,
  Effect,
  Match,
  Option,
  Queue,
  Schema,
  Stream,
  String,
  pipe,
} from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import type { KeyHintConfig } from "../button/button.ts";
import { htmlElement } from "../dom/html-element.ts";
import * as KeyHint from "../key-hint/key-hint.ts";
import { isPlain } from "../keys/keys.ts";
import { Item } from "./item.ts";
import type { Entry } from "./item.ts";

export const ChoiceKind = Schema.Literals(["Action", "Radio", "Check", "Link"]);

export type ChoiceKind = typeof ChoiceKind.Type;

const ITEM_SELECTOR = '[role^="menuitem"]';
const FIRST_ATTRIBUTE = "data-pixel-paper-slip-first";
const LAST_ATTRIBUTE = "data-pixel-paper-slip-last";

/** Where focus lands as the slip opens: its first row, or (↑ on the toggle) its last. */
export const Edge = Schema.Literals(["First", "Last"]);

export type Edge = typeof Edge.Type;

export const edgeSelector = (edge: Edge): string =>
  edge === "First" ? `[${FIRST_ATTRIBUTE}]` : `[${LAST_ATTRIBUTE}]`;

const isGroup = Item.$is("Group");

const entriesOf = (items: readonly Item[]): readonly Entry[] =>
  Array.flatMap(items, (item) => (isGroup(item) ? item.items : [item]));

const entryIds = (items: readonly Item[]): readonly string[] =>
  Array.map(entriesOf(items), (entry) => entry.id);

type RowContext<Message> = Readonly<{
  firstId: Option.Option<string>;
  lastId: Option.Option<string>;
  toChoose: (id: string, kind: ChoiceKind) => Message;
}>;

const edgeAttributes = <Message>(
  context: RowContext<Message>,
  id: string,
  h: HtmlBuilder<Message>
) => [
  ...(Option.contains(context.firstId, id)
    ? [h.Attribute(FIRST_ATTRIBUTE, "")]
    : []),
  ...(Option.contains(context.lastId, id)
    ? [h.Attribute(LAST_ATTRIBUTE, "")]
    : []),
];

const wordsView = <Message>(
  entry: Readonly<{
    label: string;
    keyHint?: KeyHintConfig;
  }>,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  h.span([h.Class("menu-label")], [entry.label]),
  ...(entry.keyHint === undefined ? [] : [KeyHint.view(entry.keyHint, h)]),
];

const buttonRowView = <Message>(
  config: Readonly<{
    entry: Exclude<Entry, Readonly<{ _tag: "Link" }>>;
    isDisabled: boolean;
    attributes: Attributes<Message>;
    children: readonly Html[];
  }>,
  context: RowContext<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { entry, isDisabled, attributes, children } = config;

  return UiButton.view(
    {
      onClick: context.toChoose(entry.id, entry._tag),
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

const entryView = <Message>(
  entry: Entry,
  context: RowContext<Message>,
  h: HtmlBuilder<Message>
): Html =>
  Match.value(entry).pipe(
    Match.withReturnType<Html>(),
    Match.tag("Action", (action) =>
      buttonRowView(
        {
          entry: action,
          isDisabled: action.isDisabled === true,
          attributes: [h.Role("menuitem")],
          children: wordsView(action, h),
        },
        context,
        h
      )
    ),
    Match.tag("Radio", (radio) =>
      buttonRowView(
        {
          entry: radio,
          isDisabled: false,
          attributes: [h.Role("menuitemradio"), h.AriaChecked(radio.isChecked)],
          children: wordsView(radio, h),
        },
        context,
        h
      )
    ),
    Match.tag("Check", (check) =>
      buttonRowView(
        {
          entry: check,
          isDisabled: false,
          attributes: [
            h.Role("menuitemcheckbox"),
            h.AriaChecked(check.isChecked),
          ],
          children: [
            h.span([h.Class("menu-check"), h.AriaHidden(true)]),
            h.span([h.Class("menu-label")], [check.label]),
          ],
        },
        context,
        h
      )
    ),
    Match.tag("Link", (link) =>
      h.keyed("a")(
        link.id,
        [
          h.Role("menuitem"),
          h.Href(link.href),
          h.Tabindex(-1),
          h.OnClick(context.toChoose(link.id, link._tag)),
          ...edgeAttributes(context, link.id, h),
        ],
        wordsView(link, h)
      )
    ),
    Match.exhaustive
  );

export const rowsView = <Message>(
  config: Readonly<{
    slipId: string;
    items: readonly Item[];
    toChoose: (id: string, kind: ChoiceKind) => Message;
  }>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const ids = entryIds(config.items);

  const context: RowContext<Message> = {
    firstId: Array.head(ids),
    lastId: Array.last(ids),
    toChoose: config.toChoose,
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
          [h.Id(headingId), h.Class("menu-note"), h.Role("none")],
          [item.label]
        ),
        ...Array.map(item.items, (entry) => entryView(entry, context, h)),
      ]
    );
  });
};

type SlipEvents<Message> = Readonly<{
  escape: Message;
  tab: Message;
  left: Message;
}>;

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
  const from = Option.getOrElse(focusedIndex(items), () => -1);

  const ordered = [
    ...Array.drop(items, from + 1),
    ...Array.take(items, from + 1),
  ];

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

const handleSlipKey = <Message>(
  slip: Element,
  event: KeyboardEvent,
  events: SlipEvents<Message>
): Option.Option<Message> => {
  if (
    event.isComposing ||
    event.defaultPrevented ||
    !(isPlain(event) || isShiftTab(event))
  ) {
    return Option.none();
  }

  const items = itemsOf(slip);
  const { length } = items;
  const current = Option.getOrElse(focusedIndex(items), () => -1);

  const moved = (didMove: boolean): Option.Option<Message> => {
    if (didMove) {
      event.preventDefault();
    }

    return Option.none();
  };

  const reported = (message: Message): Option.Option<Message> => {
    event.preventDefault();

    return Option.some(message);
  };

  return Match.value(event.key).pipe(
    Match.withReturnType<Option.Option<Message>>(),
    Match.when("ArrowDown", () =>
      moved(length > 0 && focusAt(items, wrap(current + 1, length)))
    ),
    Match.when("ArrowUp", () =>
      moved(
        length > 0 && focusAt(items, wrap(Math.max(current, 0) - 1, length))
      )
    ),
    Match.when("Home", () => moved(focusAt(items, 0))),
    Match.when("End", () => moved(focusAt(items, length - 1))),
    Match.when("Escape", () => reported(events.escape)),
    Match.when("Tab", () => reported(events.tab)),
    Match.when(
      (key) => key.length === 1 && key !== " ",
      (key) => moved(typeahead(items, key))
    ),
    Match.orElse(() => Option.none())
  );
};

const isLeaving = (
  slip: Element,
  next: EventTarget | null,
  keepId: Option.Option<string>
) =>
  !(next instanceof Node && slip.contains(next)) &&
  !(next instanceof Element && Option.contains(keepId, next.id));

const preventMouseDown = (event: Event): void => {
  event.preventDefault();
};

/** The slip's keys and focus as a stream of its owner's Messages, set up by `setup` (anchoring,
 *  portaling) and torn down with the element. A press inside the slip keeps focus where it
 *  is, so a click on a row reaches it in every browser. */
export const slipStream = <Message>(
  element: Element,
  config: Readonly<{
    placed: Message;
    events: SlipEvents<Message>;
    keepId: Option.Option<string>;
    setup: (element: Element) => () => void;
  }>
): Stream.Stream<Message> =>
  Stream.callback<Message>((queue) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const cleanup = config.setup(element);

          const onKeyDown = (event: Event): void => {
            if (!(event instanceof KeyboardEvent)) {
              return;
            }

            const maybeMessage = handleSlipKey(element, event, config.events);

            if (Option.isSome(maybeMessage)) {
              Queue.offerUnsafe(queue, maybeMessage.value);
            }
          };

          const onFocusOut = (event: Event): void => {
            if (
              event instanceof FocusEvent &&
              isLeaving(element, event.relatedTarget, config.keepId)
            ) {
              Queue.offerUnsafe(queue, config.events.left);
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
      Queue.offerUnsafe(queue, config.placed);

      return yield* Effect.never;
    })
  );

const GAP = 6;
const WINDOW_PADDING = 12;

export const anchorUnder =
  (config: Readonly<{ toggleId: string; isEnd: boolean; edge: Edge }>) =>
  (element: Element): (() => void) =>
    Anchor.anchorSetup(element, {
      buttonId: config.toggleId,
      anchor: {
        placement: config.isEnd ? "bottom-end" : "bottom-start",
        gap: GAP,
        padding: WINDOW_PADDING,
      },
      interceptTab: false,
      focusAfterPosition: true,
      focusSelector: edgeSelector(config.edge),
    });

/** Where a context slip opens, in viewport pixels. */
export const Point = Schema.Struct({ x: Schema.Finite, y: Schema.Finite });

export type Point = typeof Point.Type;

const clampInto = (start: number, size: number, limit: number): number =>
  start + size > limit - WINDOW_PADDING
    ? Math.max(WINDOW_PADDING, start - size)
    : start;

export const placeAt =
  (point: Point) =>
  (element: Element): (() => void) => {
    const cleanup = Anchor.portalToContainingRoot(element);

    if (element instanceof HTMLElement) {
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
      const rect = element.getBoundingClientRect();
      element.style.left = `${clampInto(point.x, rect.width, window.innerWidth)}px`;
      element.style.top = `${clampInto(point.y, rect.height, window.innerHeight)}px`;

      const maybeFirst = htmlElement(edgeSelector("First"), element);

      if (Option.isSome(maybeFirst)) {
        maybeFirst.value.focus({ preventScroll: true });
      }
    }

    return cleanup;
  };
