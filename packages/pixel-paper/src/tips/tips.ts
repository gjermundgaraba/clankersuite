import {
  Array,
  Duration,
  Effect,
  Equal,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  pipe,
} from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Render from "foldkit/render";
import { defineTaggedUnion } from "foldkit/schema";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import type * as Update from "foldkit/update";

import { htmlElement } from "../dom/html-element.ts";
import { prefixKeys } from "../subscription/prefix-keys.ts";

const Side = Schema.Literals(["Top", "Right"]);

type Side = typeof Side.Type;

/** What brought the tip: a resting pointer or keyboard focus. */
export const Trigger = Schema.Literals(["Pointer", "Focus"]);

export type Trigger = typeof Trigger.Type;

const Words = {
  text: Schema.String,
  maybeKey: Schema.Option(Schema.String),
  side: Side,
};

type Words = Readonly<{
  text: string;
  maybeKey: Option.Option<string>;
  side: Side;
}>;

const ShownWords = { ...Words, trigger: Trigger };

export const TipState = defineTaggedUnion({
  Cold: {},
  Waiting: Words,
  Shown: ShownWords,
  Leaving: ShownWords,
  Warm: {},
});

export type TipState = typeof TipState.Type;

/** Schema for the page's one tip layer. `version` counts its waits, and tells the current one
 *  from an earlier one whose Command is still out. */
export const Model = Schema.Struct({
  id: Schema.String,
  version: Schema.Finite,
  state: TipState,
});

export type Model = typeof Model.Type;

/** Union of all Messages the tip layer can produce. */
export const Message = defineMessageUnion({
  EnteredTipTarget: Words,
  LeftTipTarget: {},
  EnteredTip: {},
  FocusedTipTarget: Words,
  BlurredTipTarget: {},
  PressedPointer: {},
  PressedKey: {},
  CompletedWaitBeforeShowing: { version: Schema.Finite },
  CompletedWaitBeforeHiding: { version: Schema.Finite },
  CompletedWaitBeforeCooling: { version: Schema.Finite },
  CompletedShowTip: {},
  CompletedHideTip: {},
});

export type Message = typeof Message.Type;

/** Configuration for creating the tip layer with `init`. The `id` is the tip element's. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates the tip layer with no tip. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  version: 0,
  state: TipState.Cold(),
});

/** The tip element's id, unique in the document. */
export const id = (model: Model): string => model.id;

const maybeShownTrigger = (model: Model): Option.Option<Trigger> =>
  Match.value(model.state).pipe(
    Match.withReturnType<Option.Option<Trigger>>(),
    Match.tag("Shown", "Leaving", ({ trigger }) => Option.some(trigger)),
    Match.orElse(() => Option.none())
  );

const REST = Duration.millis(400);

const GRACE = Duration.millis(120);

const WARMTH = Duration.millis(400);

const TIP_ATTRIBUTE = "data-tip";

const TIP_KEY_ATTRIBUTE = "data-tip-key";

const TIP_SELECTOR = `[${TIP_ATTRIBUTE}]`;

const hasText = (element: HTMLElement, text: string): boolean =>
  element.isConnected && element.getAttribute(TIP_ATTRIBUTE) === text;

const findTipTarget = (
  trigger: Trigger,
  text: string
): Option.Option<HTMLElement> =>
  Match.value(trigger).pipe(
    Match.withReturnType<Option.Option<HTMLElement>>(),
    Match.when("Pointer", () =>
      Array.findLast(
        Array.fromIterable(
          document.querySelectorAll<HTMLElement>(`${TIP_SELECTOR}:hover`)
        ),
        (element) => hasText(element, text)
      )
    ),
    Match.when("Focus", () =>
      pipe(
        Option.fromNullishOr(document.activeElement),
        Option.flatMap((element) =>
          Option.fromNullishOr(element.closest<HTMLElement>(TIP_SELECTOR))
        ),
        Option.filter(
          (element) =>
            element.matches(":focus-visible") && hasText(element, text)
        )
      )
    ),
    Match.exhaustive
  );

const tipElement = (tipId: string): Option.Option<HTMLElement> =>
  htmlElement(`#${CSS.escape(tipId)}`);

const hidePopover = (tip: HTMLElement): void => {
  if (tip.matches(":popover-open")) {
    tip.hidePopover();
  }
};

/** Opens the tip on its control once the update that asked has rendered: focus that a closing
 *  dialog or menu hands back arrives while the top layer is still changing, and the control
 *  must still be on the page, and still the keyboard's or the pointer's, by then. The control
 *  is the tip's source, so its anchor. */
export const ShowTip = Command.define("ShowTip", {
  args: { tipId: Schema.String, text: Schema.String, trigger: Trigger },
  messages: [Message.CompletedShowTip],
  execute: ({ tipId, text, trigger }) =>
    Render.afterCommit.pipe(
      Effect.andThen(
        Effect.try(() =>
          Option.map(
            Option.all({
              tip: tipElement(tipId),
              source: findTipTarget(trigger, text),
            }),
            ({ tip, source }) => {
              hidePopover(tip);
              tip.showPopover({ source });
            }
          )
        )
      ),
      Effect.ignore,
      Effect.as(Message.CompletedShowTip())
    ),
});

/** Closes the tip. */
export const HideTip = Command.define("HideTip", {
  args: { tipId: Schema.String },
  messages: [Message.CompletedHideTip],
  execute: ({ tipId }) =>
    Effect.try(() => Option.map(tipElement(tipId), hidePopover)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedHideTip())
    ),
});

/** Waits for a resting pointer. */
export const WaitBeforeShowing = Command.define("WaitBeforeShowing", {
  args: { version: Schema.Finite },
  messages: [Message.CompletedWaitBeforeShowing],
  execute: ({ version }) =>
    Effect.sleep(REST).pipe(
      Effect.as(Message.CompletedWaitBeforeShowing({ version }))
    ),
});

/** Waits for a pointer crossing onto the tip. */
export const WaitBeforeHiding = Command.define("WaitBeforeHiding", {
  args: { version: Schema.Finite },
  messages: [Message.CompletedWaitBeforeHiding],
  execute: ({ version }) =>
    Effect.sleep(GRACE).pipe(
      Effect.as(Message.CompletedWaitBeforeHiding({ version }))
    ),
});

/** Waits out the moment after a tip closes in which the next opens at once. */
export const WaitBeforeCooling = Command.define("WaitBeforeCooling", {
  args: { version: Schema.Finite },
  messages: [Message.CompletedWaitBeforeCooling],
  execute: ({ version }) =>
    Effect.sleep(WARMTH).pipe(
      Effect.as(Message.CompletedWaitBeforeCooling({ version }))
    ),
});

type UpdateReturn = Update.Return<Model, Message>;

const wordsOf = ({ text, maybeKey, side }: Words): Words => ({
  text,
  maybeKey,
  side,
});

const show = (model: Model, words: Words, trigger: Trigger): UpdateReturn => ({
  model: modifyFields(model, {
    state: () => TipState.Shown({ ...wordsOf(words), trigger }),
  }),
  commands: [ShowTip({ tipId: model.id, text: words.text, trigger })],
});

const hide = (model: Model): UpdateReturn => {
  const nextVersion = Number.increment(model.version);

  return {
    model: modifyFields(model, {
      version: () => nextVersion,
      state: () => TipState.Warm(),
    }),
    commands: [
      HideTip({ tipId: model.id }),
      WaitBeforeCooling({ version: nextVersion }),
    ],
  };
};

const wait = (model: Model, words: Words): UpdateReturn => {
  const nextVersion = Number.increment(model.version);

  return {
    model: modifyFields(model, {
      version: () => nextVersion,
      state: () => TipState.Waiting(wordsOf(words)),
    }),
    commands: [WaitBeforeShowing({ version: nextVersion })],
  };
};

const leave = (
  model: Model,
  shown: typeof TipState.Shown.Type
): UpdateReturn => {
  const nextVersion = Number.increment(model.version);

  return {
    model: modifyFields(model, {
      version: () => nextVersion,
      state: () =>
        TipState.Leaving({ ...wordsOf(shown), trigger: shown.trigger }),
    }),
    commands: [WaitBeforeHiding({ version: nextVersion })],
  };
};

const cool = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { state: () => TipState.Cold() }),
});

const dismiss = (model: Model): UpdateReturn =>
  TipState.match<UpdateReturn>(model.state, {
    Cold: () => ({ model }),
    Waiting: () => cool(model),
    Shown: () => hide(model),
    Leaving: () => hide(model),
    Warm: () => ({ model }),
  });

const entered = (model: Model, words: Words): UpdateReturn =>
  TipState.match<UpdateReturn>(model.state, {
    Cold: () => wait(model, words),
    Waiting: (waiting) =>
      waiting.text === words.text ? { model } : wait(model, words),
    Shown: (shown) =>
      shown.text === words.text ? { model } : show(model, words, "Pointer"),
    Leaving: (leaving) =>
      leaving.text === words.text
        ? {
            model: modifyFields(model, {
              state: () =>
                TipState.Shown({ ...wordsOf(words), trigger: leaving.trigger }),
            }),
          }
        : show(model, words, "Pointer"),
    Warm: () => show(model, words, "Pointer"),
  });

/** Processes a tip layer Message and returns the next Model and Commands. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    EnteredTipTarget: (words) => entered(model, wordsOf(words)),
    LeftTipTarget: () =>
      TipState.matchOrElse<UpdateReturn>(
        model.state,
        {
          Waiting: () => cool(model),
          Shown: (shown) =>
            shown.trigger === "Pointer" ? leave(model, shown) : { model },
        },
        () => ({ model })
      ),
    EnteredTip: () =>
      TipState.matchOrElse<UpdateReturn>(
        model.state,
        {
          Leaving: (leaving) => ({
            model: modifyFields(model, {
              state: () =>
                TipState.Shown({
                  ...wordsOf(leaving),
                  trigger: leaving.trigger,
                }),
            }),
          }),
        },
        () => ({ model })
      ),
    FocusedTipTarget: (words) => show(model, wordsOf(words), "Focus"),
    BlurredTipTarget: () => dismiss(model),
    PressedPointer: () => dismiss(model),
    PressedKey: () => dismiss(model),
    CompletedWaitBeforeShowing: ({ version }) =>
      TipState.matchOrElse<UpdateReturn>(
        model.state,
        {
          Waiting: (waiting) =>
            model.version === version
              ? show(model, wordsOf(waiting), "Pointer")
              : { model },
        },
        () => ({ model })
      ),
    CompletedWaitBeforeHiding: ({ version }) =>
      TipState.matchOrElse<UpdateReturn>(
        model.state,
        {
          Leaving: () => (model.version === version ? hide(model) : { model }),
        },
        () => ({ model })
      ),
    CompletedWaitBeforeCooling: ({ version }) =>
      TipState.matchOrElse<UpdateReturn>(
        model.state,
        { Warm: () => (model.version === version ? cool(model) : { model }) },
        () => ({ model })
      ),
    CompletedShowTip: () => ({ model }),
    CompletedHideTip: () => ({ model }),
  });

type TargetMessage =
  | typeof Message.EnteredTipTarget.Type
  | typeof Message.LeftTipTarget.Type
  | typeof Message.EnteredTip.Type;

type TipTarget = Words & Readonly<{ element: HTMLElement }>;

const sideOf = (element: Element): Side =>
  element.closest('[aria-orientation="vertical"]') === null &&
  !getComputedStyle(element).writingMode.startsWith("vertical")
    ? "Top"
    : "Right";

const tipTargetOf = (target: EventTarget | null): Option.Option<TipTarget> =>
  pipe(
    Option.liftPredicate(
      target,
      (node): node is Element => node instanceof Element
    ),
    Option.flatMap((element) =>
      Option.fromNullishOr(element.closest<HTMLElement>(TIP_SELECTOR))
    ),
    Option.flatMap((element) =>
      Option.map(
        Option.fromNullishOr(element.getAttribute(TIP_ATTRIBUTE)),
        (text) => ({
          element,
          text,
          maybeKey: Option.fromNullishOr(
            element.getAttribute(TIP_KEY_ATTRIBUTE)
          ),
          side: sideOf(element),
        })
      )
    )
  );

export const pointerOverMessage = (
  tipId: string,
  event: PointerEvent
): Option.Option<TargetMessage> => {
  if (event.pointerType === "touch") {
    return Option.none();
  }

  const isOverTip =
    event.target instanceof Element &&
    event.target.closest(`#${CSS.escape(tipId)}`) !== null;

  if (isOverTip) {
    return Option.some(Message.EnteredTip());
  }

  return Option.some(
    Option.match(tipTargetOf(event.target), {
      onNone: () => Message.LeftTipTarget(),
      onSome: (target) => Message.EnteredTipTarget(wordsOf(target)),
    })
  );
};

const focusInMessage = (event: FocusEvent): Option.Option<Message> =>
  Option.map(
    Option.filter(tipTargetOf(event.target), ({ element }) =>
      element.matches(":focus-visible")
    ),
    (target) => Message.FocusedTipTarget(wordsOf(target))
  );

export const focusOutMessage = (event: FocusEvent): Option.Option<Message> =>
  Option.map(
    Option.filter(
      tipTargetOf(event.target),
      ({ element }) =>
        !(
          event.relatedTarget instanceof Node &&
          element.contains(event.relatedTarget)
        )
    ),
    () => Message.BlurredTipTarget()
  );

const isEscapeOnFocusTip = (event: KeyboardEvent, trigger: Trigger): boolean =>
  event.key === "Escape" && trigger === "Focus";

const keepFromMenusAndDialogs = (event: KeyboardEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

export const keyMessage = (
  event: KeyboardEvent,
  trigger: Trigger
): Option.Option<Message> => {
  if (event.isComposing) {
    return Option.none();
  }

  if (isEscapeOnFocusTip(event, trigger)) {
    keepFromMenusAndDialogs(event);
  }

  return Option.some(Message.PressedKey());
};

const sameWords = (previous: Message, next: Message): boolean =>
  previous._tag !== "EnteredTipTarget" ||
  next._tag !== "EnteredTipTarget" ||
  (previous.text === next.text &&
    previous.side === next.side &&
    Equal.equals(previous.maybeKey, next.maybeKey));

const pointerOverChanges = (tipId: string): Stream.Stream<Message> =>
  Dom.streamFromEventFilterMap({
    target: document,
    type: "pointerover",
    filterMapEvent: (event) => pointerOverMessage(tipId, event),
  }).pipe(
    Stream.changesWith(
      (previous, next) =>
        previous._tag === next._tag && sameWords(previous, next)
    )
  );

const tipSubscriptions = Subscription.make<Model, Message>()((entry) => ({
  pointerAndFocus: entry(
    { tipId: Schema.String },
    {
      modelToDependencies: (model) => ({ tipId: model.id }),
      dependenciesToStream: ({ tipId }) =>
        Stream.mergeAll(
          [
            pointerOverChanges(tipId),
            Dom.streamFromEvent({
              target: document,
              type: "pointerdown",
              mapEvent: (): Message => Message.PressedPointer(),
            }),
            Dom.streamFromEventFilterMap({
              target: document,
              type: "focusin",
              filterMapEvent: focusInMessage,
            }),
            Dom.streamFromEventFilterMap({
              target: document,
              type: "focusout",
              filterMapEvent: focusOutMessage,
            }),
          ],
          { concurrency: "unbounded" }
        ),
    }
  ),
  keys: entry(
    { maybeTrigger: Schema.Option(Trigger) },
    {
      modelToDependencies: (model) => ({
        maybeTrigger: maybeShownTrigger(model),
      }),
      dependenciesToStream: ({ maybeTrigger }) =>
        Option.match(maybeTrigger, {
          onNone: () => Stream.empty,
          onSome: (trigger) =>
            Dom.streamFromEventFilterMap({
              target: document,
              type: "keydown",
              filterMapEvent: (event) => keyMessage(event, trigger),
              options: { capture: true },
            }),
        }),
    }
  ),
}));

/** The page's pointer, focus and keys, read for the tip: lift it into the application's
 *  Subscriptions with a key prefix of the parent's that no other record on the page uses
 *  (`subscriptions("tip")` is keyed `tipPointerAndFocus` and `tipKeys`). Keys are listened to
 *  only while a tip shows. */
export const subscriptions = <Prefix extends string>(keyPrefix: Prefix) =>
  prefixKeys(keyPrefix, tipSubscriptions);

const maybeWordsOf = (model: Model): Option.Option<Words> =>
  Match.value(model.state).pipe(
    Match.withReturnType<Option.Option<Words>>(),
    Match.tag("Waiting", "Shown", "Leaving", (words) =>
      Option.some(wordsOf(words))
    ),
    Match.orElse(() => Option.none())
  );

/**
 * The page's one tip: `div.tip[popover="manual"][aria-hidden="true"]`, which shows the words
 * of any control carrying `data-tip` (IconButton, the glyph switch, a board's grip), then the
 * key in its `data-tip-key` where it has one (an IconButton's `keyHint`). Render it
 * once, beside the Announcer, and lift `subscriptions(keyPrefix)`. It opens on a resting
 * pointer after a moment (at once while another has just closed), never on touch, and on
 * keyboard focus; it can be hovered; leaving, blur, a press or any key closes it, and Escape
 * closes a tip keyboard focus brought up and nothing else.
 *
 * Built as a page-level Submodel rather than over `@foldkit/ui`'s Tooltip, which is one
 * Submodel per control and describes its control (`aria-describedby`). The Tip Rule is the
 * opposite: a tip says its control's accessible name and nothing else, so it stays out of the
 * accessibility tree, and any control takes one by carrying `data-tip`.
 */
export const view = defineView<Model, Message>((model, h): Html => {
  const maybeWords = maybeWordsOf(model);

  return h.div(
    [
      h.Id(model.id),
      h.Popover("manual"),
      h.AriaHidden(true),
      h.Class("tip"),
      ...(Option.exists(maybeWords, ({ side }) => side === "Right")
        ? [h.DataAttribute("side", "right")]
        : []),
    ],
    Option.match(maybeWords, {
      onNone: () => [],
      onSome: ({ text, maybeKey }) => [
        text,
        ...Array.fromOption(
          Option.map(maybeKey, (key) => h.kbd([h.Class("key-hint")], [key]))
        ),
      ],
    })
  );
});
