import {
  Array,
  Duration,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
  pipe,
} from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import * as Render from "foldkit/render";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import * as Announcer from "../announcer/announcer.ts";
import * as Button from "../button/button.ts";
import { htmlElement } from "../dom/html-element.ts";
import { Focus } from "../focus/focus.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { isPlain } from "../keys/keys.ts";
import * as Notice from "../notice/notice.ts";
import * as Stack from "./stack.ts";
import { Action } from "./stack.ts";
import type { Payload, Tone } from "./stack.ts";

/** Schema for the page's toast stack: the `@foldkit/ui` Toast stack it is built on, which
 *  holds the slips, what holds them on screen (the pointer on a slip, the keyboard in the
 *  stack), and where focus came into the stack from. */
export const Model = Schema.Struct({
  stack: Stack.Model,
  isPointerIn: Schema.Boolean,
  isFocusIn: Schema.Boolean,
  maybeReturnFocusId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

/** Union of all Messages the toast stack can produce. */
export const Message = defineMessageUnion({
  GotStackMessage: { message: Stack.Message },
  FocusedStack: { maybeFromId: Schema.Option(Schema.String) },
  BlurredStack: {},
  PressedEscape: {},
  MovedHost: {},
  ClickedAction: { entryId: Schema.String, action: Action },
  ClickedDismiss: { entryId: Schema.String },
  CompletedFocusSlip: {},
  CompletedFocus: {},
  CompletedAnnounceSlip: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages the toast stack reports: a slip's action was pressed (the slip is on
 *  its way out), with the action's id and the slip's. */
export const OutMessage = defineMessageUnion({
  SelectedAction: { id: Schema.String, entryId: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

const TOAST_HOLD = Duration.seconds(5);

const MOST_SHOWING = 3;

/** Configuration for creating the toast stack with `init`. The `id` must be unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates an empty toast stack. */
export const init = (config: InitConfig): Model => ({
  stack: Stack.init({ id: config.id, defaultDuration: TOAST_HOLD }),
  isPointerIn: false,
  isFocusIn: false,
  maybeReturnFocusId: Option.none(),
});

/** The stack's id, unique in the document. */
export const id = (model: Model): string => model.stack.id;

const isHeld = (model: Model): boolean => model.isPointerIn || model.isFocusIn;

const slips = (model: Model): readonly Stack.Entry[] =>
  Stack.showing(model.stack);

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

type StepReturn = Update.Return<Model, Message>;

const foldStackOutMessage = Stack.OutMessage.match<Update.Step<Model, Message>>(
  {
    DismissedToast: () => (model) => ({ model }),
  }
);

const foldConfig = {
  foldOutMessage: foldStackOutMessage,
  read: (model: Model) => Option.some(model.stack),
  write: (model: Model, nextStack: Stack.Model): Model =>
    modifyFields(model, { stack: () => nextStack }),
  toParentMessage: (message: Stack.Message) =>
    Message.GotStackMessage({ message }),
};

const foldStack = Update.foldChild({ update: Stack.update, ...foldConfig });

const stackStep = (
  apply: (
    stack: Stack.Model,
    entryId: string
  ) => ReturnType<typeof Stack.update>,
  entryId: string
): Update.Step<Model, Message> =>
  Update.foldChildStep({
    update: (stack: Stack.Model) => apply(stack, entryId),
    ...foldConfig,
  });

const dismissStep = (entryId: string): Update.Step<Model, Message> =>
  stackStep(Stack.dismiss, entryId);

const eachSlip = (
  model: Model,
  apply: (
    stack: Stack.Model,
    entryId: string
  ) => ReturnType<typeof Stack.update>,
  maybeExceptId: Option.Option<string>
): StepReturn =>
  Update.combine(
    model,
    Array.map(
      Array.filter(
        slips(model),
        (slip) => !Option.contains(maybeExceptId, slip.id)
      ),
      (slip) => stackStep(apply, slip.id)
    )
  );

const holdAll = (model: Model): StepReturn =>
  eachSlip(model, Stack.hold, Option.none());

const releaseUnlessHeld = (
  model: Model,
  maybeExceptId: Option.Option<string>
): StepReturn =>
  isHeld(model)
    ? holdAll(model)
    : eachSlip(model, Stack.release, maybeExceptId);

type PointerMove = Readonly<{ isPointerIn: boolean; entryId: string }>;

const pointerMoved = (
  stackMessage: Stack.Message
): Option.Option<PointerMove> =>
  Match.value(stackMessage).pipe(
    Match.withReturnType<Option.Option<PointerMove>>(),
    Match.tag("HoveredEntry", ({ entryId }) =>
      Option.some({ isPointerIn: true, entryId })
    ),
    Match.tag("LeftEntry", ({ entryId }) =>
      Option.some({ isPointerIn: false, entryId })
    ),
    Match.orElse(() => Option.none())
  );

const holdIfHeld =
  (entryId: string): Update.Step<Model, Message> =>
  (model) =>
    isHeld(model) ? stackStep(Stack.hold, entryId)(model) : { model };

const updateStack = (model: Model, stackMessage: Stack.Message): UpdateReturn =>
  Option.match(pointerMoved(stackMessage), {
    onNone: () => foldStack(model, stackMessage),
    onSome: ({ isPointerIn, entryId }) =>
      Update.combine(modifyFields(model, { isPointerIn: () => isPointerIn }), [
        foldStack(stackMessage),
        (moved) => releaseUnlessHeld(moved, Option.some(entryId)),
      ]),
  });

/** Moves focus, after the keyboard dismissed a slip, to the dismiss button of the slip now in
 *  its place, or the one before it. */
export const FocusSlip = Command.define("FocusSlip", {
  args: { entryId: Schema.String },
  messages: [Message.CompletedFocusSlip],
  execute: ({ entryId }) =>
    Dom.focus(`#${CSS.escape(entryId)} .toast > .iconbtn`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusSlip())
    ),
});

const stackElement = (stackId: string): Option.Option<HTMLElement> =>
  htmlElement(`#${CSS.escape(stackId)}`);

/**
 * Says a raised slip exactly once. `@foldkit/ui`'s stack is always a polite live region, so a
 * slip added to a stack already on the page is read from there, and this says nothing more. A
 * stack mounted in the same render (it moved to another host, a Dialog opening or closing in
 * the same update) is a live region that arrives already holding the slip, which goes
 * unheard: then the slip is said through the page's live region (as `Announcer.Announce` does),
 * which follows the same host. It compares the stack element before and after the render.
 */
export const AnnounceSlip = Command.define("AnnounceSlip", {
  args: { stackId: Schema.String, text: Schema.String },
  messages: [Message.CompletedAnnounceSlip],
  execute: ({ stackId, text }) =>
    Effect.gen(function* () {
      const maybeBefore = yield* Effect.sync(() => stackElement(stackId));
      yield* Render.afterCommit;
      const maybeAfter = yield* Effect.sync(() => stackElement(stackId));

      const isHeardFromStack =
        Option.isSome(maybeBefore) &&
        Option.isSome(maybeAfter) &&
        maybeBefore.value === maybeAfter.value;

      if (!isHeardFromStack) {
        yield* Announcer.announce(text);
      }

      return Message.CompletedAnnounceSlip();
    }),
});

type FocusCommand = ReturnType<typeof FocusSlip> | ReturnType<typeof Focus>;

const focusAfter = (
  model: Model,
  entryId: string
): Option.Option<FocusCommand> => {
  const index = Option.getOrElse(
    Array.findFirstIndex(slips(model), (slip) => slip.id === entryId),
    () => 0
  );

  const remaining = Array.filter(slips(model), (slip) => slip.id !== entryId);

  return Option.match(
    Array.get(remaining, Math.min(index, remaining.length - 1)),
    {
      onSome: (slip): Option.Option<FocusCommand> =>
        Option.some(FocusSlip({ entryId: slip.id })),
      onNone: (): Option.Option<FocusCommand> =>
        Option.map(model.maybeReturnFocusId, (elementId) =>
          Focus({ id: elementId })
        ),
    }
  );
};

const dismissKeepingFocus = (model: Model, entryId: string): StepReturn =>
  Update.combine(model, [
    dismissStep(entryId),
    (stepModel) =>
      model.isFocusIn
        ? {
            model: modifyFields(stepModel, {
              isFocusIn: () => !Array.isReadonlyArrayEmpty(slips(stepModel)),
            }),
            commands: Option.toArray(focusAfter(model, entryId)),
          }
        : { model: stepModel },
  ]);

/** Processes a toast stack Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotStackMessage: ({ message: stackMessage }) =>
      updateStack(model, stackMessage),
    FocusedStack: ({ maybeFromId }) =>
      holdAll(
        modifyFields(model, {
          isFocusIn: () => true,
          maybeReturnFocusId: (returnId) =>
            model.isFocusIn ? returnId : maybeFromId,
        })
      ),
    BlurredStack: () =>
      model.isFocusIn
        ? releaseUnlessHeld(
            modifyFields(model, { isFocusIn: () => false }),
            Option.none()
          )
        : { model },
    PressedEscape: () =>
      Option.match(Array.last(slips(model)), {
        onNone: () => ({ model }),
        onSome: (newest) => dismissKeepingFocus(model, newest.id),
      }),
    MovedHost: () =>
      releaseUnlessHeld(
        modifyFields(model, {
          isFocusIn: () => false,
          isPointerIn: () => false,
        }),
        Option.none()
      ),
    ClickedAction: ({ entryId, action }) =>
      pipe(
        dismissKeepingFocus(model, entryId),
        Update.withOutMessage(
          OutMessage.SelectedAction({ id: action.id, entryId })
        )
      ),
    ClickedDismiss: ({ entryId }) => dismissKeepingFocus(model, entryId),
    CompletedFocusSlip: () => ({ model }),
    CompletedFocus: () => ({ model }),
    CompletedAnnounceSlip: () => ({ model }),
  });

/** What `show` raises. */
export type ShowConfig = Readonly<{
  tone: Tone;
  /** Pixel caps: what happened (`"Saved"`, `"Not sent"`). */
  title: string;
  /** One sans sentence: what it means, and for an error what to do. */
  body?: string;
  action?: Action;
}>;

const oldestCalm = (model: Model): Option.Option<Stack.Entry> => {
  const calm = Array.filter(
    slips(model),
    (slip) => slip.payload.tone !== "Error"
  );

  return Option.filter(Array.head(calm), () => calm.length >= MOST_SHOWING);
};

/** What `show` returns: the next Model and Commands, and the new slip's id, to take it back
 *  with `dismiss`. */
export type ShowReturn = Update.Return<Model, Message> &
  Readonly<{ entryId: string }>;

const spoken = (config: ShowConfig): string =>
  config.body === undefined
    ? `${config.title}.`
    : `${config.title}. ${config.body}`;

/**
 * Raises a slip and says it once (see `AnnounceSlip`). At most `MOST_SHOWING` slips that are
 * not errors show: one more takes the place of the oldest of them. Errors stack without limit,
 * take nothing's place, and stay until the reader dismisses them or the application takes
 * them back with `dismiss` and the returned `entryId`. Every tone, an error included, is said
 * politely, never as an alert. A slip raised while the stack is held waits with the others.
 */
export const show = (model: Model, config: ShowConfig): ShowReturn => {
  const payload: Payload = {
    tone: config.tone,
    title: config.title,
    maybeBody: Option.fromNullishOr(config.body),
    maybeAction: Option.fromNullishOr(config.action),
  };

  const maybeReplaced = Option.filter(
    oldestCalm(model),
    () => config.tone !== "Error"
  );

  const raised = Update.combine(model, [
    ...Array.fromOption(
      Option.map(maybeReplaced, (slip) => dismissStep(slip.id))
    ),
    Update.foldChildStep({
      update: (stack: Stack.Model) =>
        Stack.show(stack, {
          payload,
          variant: "Info",
          sticky: config.tone === "Error",
        }),
      ...foldConfig,
    }),
  ]);

  const entryId = Option.getOrThrowWith(
    Stack.newestId(raised.model.stack),
    () => new Error("The toast stack raised no entry.")
  );

  const shown = Update.combine(raised.model, [
    holdIfHeld(entryId),
    (stepModel) => ({
      model: stepModel,
      commands: [
        AnnounceSlip({ stackId: id(stepModel), text: spoken(config) }),
      ],
    }),
  ]);

  return {
    model: shown.model,
    commands: [...(raised.commands ?? []), ...(shown.commands ?? [])],
    entryId,
  };
};

/** Takes a slip back by its id: what it reported has recovered. */
export const dismiss = (model: Model, entryId: string): StepReturn =>
  dismissKeepingFocus(model, entryId);

const slipView = (entry: Stack.Entry, h: HtmlBuilder<Message>): Html => {
  const { tone, title, maybeBody, maybeAction } = entry.payload;

  return h.div(
    [h.Class(`notice toast${Notice.TONE_CLASS[tone]}`)],
    [
      Notice.toneGlyphView({ tone }, h),
      h.div([], [h.strong([], [title]), ...Option.toArray(maybeBody)]),
      ...Array.fromOption(
        Option.map(maybeAction, (action) =>
          Button.view(
            {
              label: action.label,
              isSmall: true,
              onClick: Message.ClickedAction({ entryId: entry.id, action }),
            },
            h
          )
        )
      ),
      IconButton.view(
        {
          glyph: "cross",
          label: `Dismiss: ${title}`,
          onClick: Message.ClickedDismiss({ entryId: entry.id }),
        },
        h
      ),
    ]
  );
};

type StackKeyMessage =
  | typeof Message.FocusedStack.Type
  | typeof Message.BlurredStack.Type
  | typeof Message.PressedEscape.Type;

const isOutside = (stack: Element, target: EventTarget | null): boolean =>
  !(target instanceof Node && stack.contains(target));

const elementId = (target: EventTarget | null): Option.Option<string> =>
  target instanceof Element && target.id !== ""
    ? Option.some(target.id)
    : Option.none();

const isEscape = (event: KeyboardEvent): boolean =>
  event.key === "Escape" &&
  !event.isComposing &&
  !event.defaultPrevented &&
  isPlain(event);

export const stackFocusIn = (
  stack: Element,
  event: FocusEvent
): Option.Option<typeof Message.FocusedStack.Type> =>
  Option.liftPredicate(
    Message.FocusedStack({ maybeFromId: elementId(event.relatedTarget) }),
    () => isOutside(stack, event.relatedTarget)
  );

export const stackFocusOut = (
  stack: Element,
  event: FocusEvent
): Option.Option<typeof Message.BlurredStack.Type> =>
  Option.liftPredicate(Message.BlurredStack(), () =>
    isOutside(stack, event.relatedTarget)
  );

export const stackKey = (
  event: KeyboardEvent
): Option.Option<typeof Message.PressedEscape.Type> =>
  Option.liftPredicate(Message.PressedEscape(), () => isEscape(event));

/** The stack's focus and keys: focus coming in (and from where) and going out, and Escape
 *  on a slip, which takes the newest and keeps a Dialog the stack sits in open (its default is
 *  prevented). In a Scene, resolve it with `sceneMounts`. */
export const BindStack = Mount.defineStream("BindStack", {
  messages: [Message.FocusedStack, Message.BlurredStack, Message.PressedEscape],
  execute: ({ element }) =>
    Stream.mergeAll<StackKeyMessage, never, never>(
      [
        Dom.streamFromEventFilterMap({
          target: element,
          type: "focusin",
          filterMapEvent: (event) => stackFocusIn(element, event),
        }),
        Dom.streamFromEventFilterMap({
          target: element,
          type: "focusout",
          filterMapEvent: (event) => stackFocusOut(element, event),
        }),
        Dom.streamFromEventFilterMapPreventDefault({
          target: element,
          type: "keydown",
          filterMapEvent: stackKey,
        }),
      ],
      { concurrency: "unbounded" }
    ),
});

/**
 * The page's toasts: printed slips at the bottom right (across the bottom on a phone), the
 * newest lowest, built on `@foldkit/ui`'s Toast, in a polite live region named
 * "Notifications". Each slip is said once as it is raised: by the stack, or through the
 * page's live region when the stack moved host in the same render (see `AnnounceSlip`). Ok
 * and quiet slips leave after the hold, which waits while the pointer is on any slip or the
 * keyboard is in the stack; Escape in the stack dismisses the newest, and focus moves to the
 * slip now in its place, or back where it came from once none is left.
 *
 * Render it once, placed by the rule the Announcer follows: while a Dialog is open, inside the
 * topmost one (in its `toLiveRegionView`, beside the Announcer), so a toast raised from a card
 * shows above it and can be reached; otherwise in the body. Moving it lets go of its holds.
 */
export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [
      h.OnMount(BindStack()),
      h.OnUnmount(Message.MovedHost()),
      h.Class("toasts"),
    ],
    [
      h.submodel({
        slotId: `${id(model)}-entries`,
        model: model.stack,
        view: Stack.view,
        viewInputs: {
          position: "BottomRight",
          ariaLabel: "Notifications",
          containerClassName: "toast-stack",
          entryToView: (entry) => slipView(entry, h),
        },
        toParentMessage: (message) => Message.GotStackMessage({ message }),
      }),
    ]
  )
);

/** What a parent's Scene resolves the stack's Mounts with, each with a Message that changes
 *  nothing: `Scene.Mount.resolveAll(...Toast.sceneMounts)`. */
export const sceneMounts = [[BindStack, Message.BlurredStack()]] as const;
