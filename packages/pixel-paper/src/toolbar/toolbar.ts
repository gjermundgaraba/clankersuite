import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  pipe,
} from "effect";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import { isPlain } from "../keys/keys.ts";

/** Which way the strip lies. A `Vertical` strip stands on end: a canvas's tools down its left
 *  edge. The arrows of both axes move in either. */
export const Orientation = Schema.Literals(["Horizontal", "Vertical"]);

export type Orientation = typeof Orientation.Type;

const ToolMove = Schema.Literals(["Previous", "Next", "First", "Last"]);

type ToolMove = typeof ToolMove.Type;

/** What a toolbar's keys report: a move they already made. Nothing in a Model follows it. */
export const Message = defineMessageUnion({
  MovedToolFocus: { move: ToolMove },
});

export type Message = typeof Message.Type;

const TOOL_SELECTOR = "button:not(:disabled), a[href]";

const isOwnTool =
  (bar: Element) =>
  (tool: HTMLElement): boolean => {
    const popover = tool.closest("[popover]");

    return (
      tool.closest('[role="toolbar"]') === bar &&
      (popover === null || !bar.contains(popover))
    );
  };

const tools = (bar: Element): readonly HTMLElement[] =>
  Array.filter(
    Array.fromIterable(bar.querySelectorAll<HTMLElement>(TOOL_SELECTOR)),
    isOwnTool(bar)
  );

const rove = (bar: Element, to: HTMLElement): void => {
  for (const tool of tools(bar)) {
    tool.tabIndex = tool === to ? 0 : -1;
  }
};

const roveToCurrent = (bar: Element): void => {
  const all = tools(bar);

  const maybeCurrent = Option.orElse(
    Array.findFirst(all, (tool) => tool.getAttribute("tabindex") === "0"),
    () => Array.head(all)
  );

  if (Option.isSome(maybeCurrent)) {
    rove(bar, maybeCurrent.value);
  }
};

const toToolMove = (key: string): Option.Option<ToolMove> =>
  Match.value(key).pipe(
    Match.withReturnType<Option.Option<ToolMove>>(),
    Match.whenOr("ArrowUp", "ArrowLeft", () => Option.some("Previous")),
    Match.whenOr("ArrowDown", "ArrowRight", () => Option.some("Next")),
    Match.when("Home", () => Option.some("First")),
    Match.when("End", () => Option.some("Last")),
    Match.orElse(() => Option.none())
  );

const targetIndex = (
  move: ToolMove,
  index: number,
  lastIndex: number
): number =>
  Match.value(move).pipe(
    Match.withReturnType<number>(),
    Match.when("Previous", () =>
      Number.clamp(index - 1, { minimum: 0, maximum: lastIndex })
    ),
    Match.when("Next", () =>
      Number.clamp(index + 1, { minimum: 0, maximum: lastIndex })
    ),
    Match.when("First", () => 0),
    Match.when("Last", () => lastIndex),
    Match.exhaustive
  );

type ToolStep = Readonly<{ move: ToolMove; tool: HTMLElement }>;

const toolStep = (
  bar: Element,
  event: KeyboardEvent
): Option.Option<ToolStep> => {
  if (event.isComposing || event.defaultPrevented || !isPlain(event)) {
    return Option.none();
  }

  return Option.flatMap(toToolMove(event.key), (move) => {
    const all = tools(bar);

    return pipe(
      Array.findFirstIndex(all, (tool) => tool === event.target),
      Option.flatMap((index) =>
        Array.get(all, targetIndex(move, index, all.length - 1))
      ),
      Option.map((tool) => ({ move, tool }))
    );
  });
};

const moveToolFocus = (
  bar: Element,
  event: KeyboardEvent
): Option.Option<Message> => {
  const maybeStep = toolStep(bar, event);

  if (Option.isSome(maybeStep)) {
    rove(bar, maybeStep.value.tool);
    maybeStep.value.tool.focus();
  }

  return Option.map(maybeStep, ({ move }) => Message.MovedToolFocus({ move }));
};

const keepStop = (bar: Element): Stream.Stream<never> =>
  Stream.callback<never>(() =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const observer = new MutationObserver(() => {
          roveToCurrent(bar);
        });

        roveToCurrent(bar);
        observer.observe(bar, {
          childList: true,
          subtree: true,
          attributeFilter: ["disabled", "href"],
        });

        return observer;
      }),
      (observer) =>
        Effect.sync(() => {
          observer.disconnect();
        })
    )
  );

/** The toolbar's keys and its roving stop for Tab. Either axis's arrows move focus one tool
 *  and stop at the ends, Home and End go to the ends, and the default is prevented only for a
 *  key that moved. Keys act only when their target is one of the bar's own tools: a key typed
 *  in a field or in a menu a tool opened, a key an IME is composing, a modified key and a key
 *  someone already handled are left alone. One tool is in the tab order, the one focused last,
 *  else the first, and it stays so as tools come and go. Attached by `view`, which lifts it
 *  into the parent's Message (see `toParentMessage`). */
export const BindToolKeys = Mount.defineStream("BindToolKeys", {
  messages: [Message.MovedToolFocus],
  execute: ({ element }) =>
    Stream.mergeAll(
      [
        Dom.streamFromEventFilterMapPreventDefault({
          target: element,
          type: "keydown",
          filterMapEvent: (event) => moveToolFocus(element, event),
        }),
        Dom.streamFromEventFilterMap({
          target: element,
          type: "focusin",
          filterMapEvent: (event) =>
            Array.findFirst(tools(element), (tool) => tool === event.target),
        }).pipe(
          Stream.tap((tool) =>
            Effect.sync(() => {
              rove(element, tool);
            })
          ),
          Stream.drain
        ),
        keepStop(element),
      ],
      { concurrency: "unbounded" }
    ),
});

/** Configuration for rendering a toolbar with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  /** Names the toolbar for screen readers. */
  label: string;
  /** IconButtons and small Buttons; a tool in force is `aria-pressed`. */
  tools: readonly Html[];
  orientation?: Orientation;
  /** Floats above what is under it, on the button print shadow. */
  isFloating?: boolean;
  /** Lifts the toolbar's lifecycle Message (`BindToolKeys` moved focus: `MovedToolFocus`) into
   *  the parent's Message, which the parent's update takes and changes nothing for. In a
   *  Scene, resolve the Mount by name with the lifted Message:
   *  `Scene.Mount.resolve({ name: Toolbar.BindToolKeys.name }, toParentMessage(Toolbar.Message.MovedToolFocus({ move })))`. */
  toParentMessage: (message: Message) => ParentMessage;
}>;

/** A strip of tools that is one stop for Tab (`role="toolbar"`, named by its label, with its
 *  `aria-orientation`): the arrows move between the tools and stop at the ends, Home and End
 *  go to the ends, and Tab comes back to the tool used last. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const {
    label,
    tools: toolViews,
    orientation = "Horizontal",
    isFloating = false,
    toParentMessage,
  } = config;

  return h.div(
    [
      h.Role("toolbar"),
      h.AriaLabel(label),
      h.AriaOrientation(orientation === "Vertical" ? "vertical" : "horizontal"),
      h.OnMount(Mount.mapMessage(BindToolKeys(), toParentMessage)),
      h.Class(isFloating ? "toolbar floating" : "toolbar"),
    ],
    toolViews
  );
};
