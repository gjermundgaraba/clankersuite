import { Input as UiInput } from "@foldkit/ui";
import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Queue,
  Schema,
  Stream,
} from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { defineTaggedUnion } from "foldkit/schema";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";

import * as Button from "../button/button.ts";
import { UNKNOWN_CLOCK, formatClock } from "../format/format.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { isPlain } from "../keys/keys.ts";
import { slotView } from "../slot/slot.ts";

/** The space a frame keeps before its picture arrives, so nothing moves when it does: the
 *  picture's own size in CSS pixels (it prints at that width and shrinks to fit, never grows),
 *  or a ratio of width to height (16 / 9) that fills the width it is given. */
export const FrameSize = defineTaggedUnion({
  Pixels: { width: Schema.Finite, height: Schema.Finite },
  Ratio: { ratio: Schema.Finite },
});

export type FrameSize = typeof FrameSize.Type;

export const frameStyle = (size: FrameSize): Record<string, string> =>
  FrameSize.match(size, {
    Pixels: ({ width, height }) => ({
      "--ratio": `${width} / ${height}`,
      width: `min(${width}px + 2 * var(--line), 100%)`,
    }),
    Ratio: ({ ratio }) => ({ "--ratio": `${ratio}` }),
  });

export const sizeAttributes = <Message>(
  size: FrameSize,
  h: HtmlBuilder<Message>
) =>
  FrameSize.match(size, {
    Pixels: ({ width, height }) => [h.Width(`${width}`), h.Height(`${height}`)],
    Ratio: () => [],
  });

/** What a frame holds whatever its source does: a specimen, or a source the product already
 *  knows is gone. */
export const Held = Schema.Literals(["Loading", "Broken"]);

export type Held = typeof Held.Type;

export const captionView = <Message>(
  caption: ReadonlyArray<Html | string>,
  credit: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Array.match(
    [
      ...Array.match(caption, {
        onEmpty: () => [],
        onNonEmpty: (words) => [h.span([], words)],
      }),
      ...slotView("span", "meta", credit, h),
    ],
    {
      onEmpty: () => [],
      onNonEmpty: (lines) => [h.figcaption([h.Class("media-caption")], lines)],
    }
  );

/** Schema for a player: the element's state as its events last said it. */
export const Model = Schema.Struct({
  id: Schema.String,
  isPlaying: Schema.Boolean,
  time: Schema.Finite,
  maybeDuration: Schema.Option(Schema.Finite),
  isMuted: Schema.Boolean,
  isWaiting: Schema.Boolean,
  maybeErrorCode: Schema.Option(Schema.Finite),
  isShowingCaptions: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Reading = Schema.Struct({
  isPlaying: Schema.Boolean,
  time: Schema.Finite,
  maybeDuration: Schema.Option(Schema.Finite),
  isMuted: Schema.Boolean,
  maybeErrorCode: Schema.Option(Schema.Finite),
});

export type Reading = typeof Reading.Type;

/** Union of all Messages a player can produce. */
export const Message = defineMessageUnion({
  ClickedPlay: {},
  ClickedPause: {},
  ClickedMute: {},
  ClickedCaptions: {},
  ClickedRetry: {},
  UpdatedSeek: { to: Schema.Finite },
  PressedPlaybackKey: {},
  PressedSeekKey: { by: Schema.Finite },
  UpdatedMediaState: { reading: Reading },
  UpdatedWaiting: { isWaiting: Schema.Boolean },
  CompletedPlayMedia: {},
  CompletedPauseMedia: {},
  CompletedSeekMedia: {},
  CompletedReloadMedia: {},
  CompletedShowCaptions: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages a player reports to its parent: the reader asked to load the source
 *  again, and it is loading. */
export const OutMessage = defineMessageUnion({
  Retried: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a player with `init`. The `id` must be unique in the document:
 *  it is the media element's. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a player at rest: paused at the start, its length not yet known. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isPlaying: false,
  time: 0,
  maybeDuration: Option.none(),
  isMuted: false,
  isWaiting: false,
  maybeErrorCode: Option.none(),
  isShowingCaptions: false,
});

/** The media element's id, unique in the document. */
export const id = (model: Model): string => model.id;

const withMedia = (
  mediaId: string,
  act: (media: HTMLMediaElement) => void
): Effect.Effect<void> =>
  Effect.sync(() => {
    const element = document.querySelector(`#${CSS.escape(mediaId)}`);

    if (element instanceof HTMLMediaElement) {
      act(element);
    }
  });

/** Plays the media element. A refused play (no source, autoplay rules) settles quietly. */
export const PlayMedia = Command.define("PlayMedia", {
  args: { mediaId: Schema.String },
  messages: [Message.CompletedPlayMedia],
  execute: ({ mediaId }) =>
    Effect.suspend(() => {
      const element = document.querySelector(`#${CSS.escape(mediaId)}`);

      return element instanceof HTMLMediaElement
        ? Effect.tryPromise(async () => {
            await element.play();
          })
        : Effect.void;
    }).pipe(Effect.ignore, Effect.as(Message.CompletedPlayMedia())),
});

/** Pauses the media element. */
export const PauseMedia = Command.define("PauseMedia", {
  args: { mediaId: Schema.String },
  messages: [Message.CompletedPauseMedia],
  execute: ({ mediaId }) =>
    withMedia(mediaId, (media) => {
      media.pause();
    }).pipe(Effect.as(Message.CompletedPauseMedia())),
});

/** Moves the media element to a place, in seconds. */
export const SeekMedia = Command.define("SeekMedia", {
  args: { mediaId: Schema.String, to: Schema.Finite },
  messages: [Message.CompletedSeekMedia],
  execute: ({ mediaId, to }) =>
    withMedia(mediaId, (media) => {
      media.currentTime = to;
    }).pipe(Effect.as(Message.CompletedSeekMedia())),
});

/** Loads the media element's source again. */
export const ReloadMedia = Command.define("ReloadMedia", {
  args: { mediaId: Schema.String },
  messages: [Message.CompletedReloadMedia],
  execute: ({ mediaId }) =>
    withMedia(mediaId, (media) => {
      media.load();
    }).pipe(Effect.as(Message.CompletedReloadMedia())),
});

const captionsMode = (isShowing: boolean): TextTrackMode =>
  isShowing ? "showing" : "hidden";

/** Shows or hides the media element's caption tracks. */
export const ShowCaptions = Command.define("ShowCaptions", {
  args: { mediaId: Schema.String, isShowing: Schema.Boolean },
  messages: [Message.CompletedShowCaptions],
  execute: ({ mediaId, isShowing }) =>
    withMedia(mediaId, (media) => {
      for (const track of media.textTracks) {
        track.mode = captionsMode(isShowing);
      }
    }).pipe(Effect.as(Message.CompletedShowCaptions())),
});

export const SEEK_STEP = 5;

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const play = (model: Model): UpdateReturn => ({
  model,
  commands: [PlayMedia({ mediaId: model.id })],
});

const pause = (model: Model): UpdateReturn => ({
  model,
  commands: [PauseMedia({ mediaId: model.id })],
});

const seek = (model: Model, to: number): UpdateReturn =>
  Option.match(model.maybeDuration, {
    onNone: () => ({ model }),
    onSome: (duration) => {
      const clamped = Number.clamp(to, { minimum: 0, maximum: duration });

      return {
        model: modifyFields(model, { time: () => clamped }),
        commands: [SeekMedia({ mediaId: model.id, to: clamped })],
      };
    },
  });

const playOrPause = (model: Model): UpdateReturn =>
  model.isPlaying ? pause(model) : play(model);

const isFailed = (model: Model): boolean => Option.isSome(model.maybeErrorCode);

/** Processes a player Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedPlay: () => play(model),
    ClickedPause: () => pause(model),
    ClickedMute: () => ({
      model: modifyFields(model, { isMuted: (isMuted) => !isMuted }),
    }),
    ClickedCaptions: () => ({
      model: modifyFields(model, {
        isShowingCaptions: (isShowing) => !isShowing,
      }),
      commands: [
        ShowCaptions({
          mediaId: model.id,
          isShowing: !model.isShowingCaptions,
        }),
      ],
    }),
    ClickedRetry: () => ({
      model: modifyFields(model, { maybeErrorCode: () => Option.none() }),
      commands: [ReloadMedia({ mediaId: model.id })],
      outMessage: OutMessage.Retried(),
    }),
    UpdatedSeek: ({ to }) => seek(model, to),
    PressedPlaybackKey: () =>
      isFailed(model) ? { model } : playOrPause(model),
    PressedSeekKey: ({ by }) =>
      isFailed(model) ? { model } : seek(model, model.time + by),
    UpdatedMediaState: ({ reading }) => ({
      model: modifyFields(model, {
        isPlaying: () => reading.isPlaying,
        time: () => reading.time,
        maybeDuration: () => reading.maybeDuration,
        isMuted: () => reading.isMuted,
        maybeErrorCode: () => reading.maybeErrorCode,
      }),
    }),
    UpdatedWaiting: ({ isWaiting }) => ({
      model: modifyFields(model, { isWaiting: () => isWaiting }),
    }),
    CompletedPlayMedia: () => ({ model }),
    CompletedPauseMedia: () => ({ model }),
    CompletedSeekMedia: () => ({ model }),
    CompletedReloadMedia: () => ({ model }),
    CompletedShowCaptions: () => ({ model }),
  });

const readMedia = (media: HTMLMediaElement): Reading => ({
  isPlaying: !media.paused,
  time: media.currentTime,
  maybeDuration: Option.liftPredicate(
    media.duration,
    globalThis.Number.isFinite
  ),
  isMuted: media.muted,
  maybeErrorCode: Option.map(
    Option.fromNullishOr(media.error),
    ({ code }) => code
  ),
});

const MediaEvent = Schema.Literals(["Read", "Wait", "Settle"]);

type MediaEvent = typeof MediaEvent.Type;

const MEDIA_EVENTS: ReadonlyArray<readonly [string, MediaEvent]> = [
  ["loadedmetadata", "Read"],
  ["durationchange", "Read"],
  ["timeupdate", "Read"],
  ["play", "Read"],
  ["volumechange", "Read"],
  ["waiting", "Wait"],
  ["pause", "Settle"],
  ["ended", "Settle"],
  ["playing", "Settle"],
  ["canplay", "Settle"],
  ["seeked", "Settle"],
  ["error", "Settle"],
  ["emptied", "Settle"],
];

type ElementMessage =
  | typeof Message.UpdatedMediaState.Type
  | typeof Message.UpdatedWaiting.Type;

const toMessages = (
  media: HTMLMediaElement,
  event: MediaEvent
): readonly ElementMessage[] =>
  Match.value(event).pipe(
    Match.withReturnType<readonly ElementMessage[]>(),
    Match.when("Read", () => [
      Message.UpdatedMediaState({ reading: readMedia(media) }),
    ]),
    Match.when("Wait", () => [Message.UpdatedWaiting({ isWaiting: true })]),
    Match.when("Settle", () => [
      Message.UpdatedWaiting({ isWaiting: false }),
      Message.UpdatedMediaState({ reading: readMedia(media) }),
    ]),
    Match.exhaustive
  );

/** Reads a media element's state from its own events, and once when it mounts, for whatever
 *  happened before the page's script ran (the metadata read, or the source already failed).
 *  It also starts every caption track hidden, not disabled, so its cues load before they are
 *  asked for. Attached to the `<audio>` or `<video>`. */
export const ReadMedia = Mount.defineStream("ReadMedia", {
  messages: [Message.UpdatedMediaState, Message.UpdatedWaiting],
  execute: ({ element }) =>
    Stream.callback<ElementMessage>((queue) =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLMediaElement)) {
          return yield* Effect.never;
        }

        const offer = (event: MediaEvent) => (): void => {
          for (const message of toMessages(element, event)) {
            Queue.offerUnsafe(queue, message);
          }
        };

        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const listeners = Array.map(MEDIA_EVENTS, ([type, event]) => {
              const listener = offer(event);
              element.addEventListener(type, listener);

              return [type, listener] as const;
            });

            for (const track of element.textTracks) {
              track.mode = captionsMode(false);
            }

            offer("Read")();

            return listeners;
          }),
          (listeners) =>
            Effect.sync(() => {
              for (const [type, listener] of listeners) {
                element.removeEventListener(type, listener);
              }
            })
        );

        return yield* Effect.never;
      })
    ),
});

type KeyMessage =
  | typeof Message.PressedPlaybackKey.Type
  | typeof Message.PressedSeekKey.Type;

const toKeyMessage = (event: KeyboardEvent): Option.Option<KeyMessage> => {
  const target = Option.liftPredicate(
    event.target,
    (eventTarget) => eventTarget instanceof Element
  );

  const isOnSeek = Option.exists(target, (element) =>
    element.matches("input[type=range]")
  );

  const isOnButton = Option.exists(
    target,
    (element) => element.tagName === "BUTTON"
  );

  return Match.value(event.key).pipe(
    Match.withReturnType<Option.Option<KeyMessage>>(),
    Match.when("k", () => Option.some(Message.PressedPlaybackKey())),
    Match.when(" ", () =>
      Option.liftPredicate(Message.PressedPlaybackKey(), () => !isOnButton)
    ),
    Match.when("ArrowLeft", () =>
      Option.some(Message.PressedSeekKey({ by: -SEEK_STEP }))
    ),
    Match.when("ArrowRight", () =>
      Option.some(Message.PressedSeekKey({ by: SEEK_STEP }))
    ),
    Match.when("ArrowDown", () =>
      Option.liftPredicate(
        Message.PressedSeekKey({ by: -SEEK_STEP }),
        () => isOnSeek
      )
    ),
    Match.when("ArrowUp", () =>
      Option.liftPredicate(
        Message.PressedSeekKey({ by: SEEK_STEP }),
        () => isOnSeek
      )
    ),
    Match.orElse(() => Option.none())
  );
};

export const playerKey = (event: KeyboardEvent): Option.Option<KeyMessage> =>
  event.isComposing || event.defaultPrevented || !isPlain(event)
    ? Option.none()
    : toKeyMessage(event);

/** The player's keys, read from real key events on its frame (see `playerKey`). Attach it to
 *  the frame. In a Scene, resolve it with `Message.PressedPlaybackKey`. */
export const BindPlayerKeys = Mount.defineStream("BindPlayerKeys", {
  messages: [Message.PressedPlaybackKey, Message.PressedSeekKey],
  execute: ({ element }) =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: element,
      type: "keydown",
      filterMapEvent: playerKey,
    }),
});

const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;

export const failureReason = (maybeErrorCode: Option.Option<number>): string =>
  Match.value(maybeErrorCode).pipe(
    Match.withReturnType<string>(),
    Match.when(
      Option.contains(MEDIA_ERR_ABORTED),
      () => "Loading was stopped before it could play."
    ),
    Match.when(
      Option.contains(MEDIA_ERR_NETWORK),
      () => "The connection dropped while it loaded."
    ),
    Match.when(
      Option.contains(MEDIA_ERR_DECODE),
      () => "The file is damaged or cut short."
    ),
    Match.orElse(
      () => "The source is missing, or in a format this browser cannot play."
    )
  );

export const isBroken = (
  model: Model,
  maybeHeld: Option.Option<Held>
): boolean =>
  Option.contains(maybeHeld, "Broken") ||
  (!Option.contains(maybeHeld, "Loading") &&
    Option.isSome(model.maybeErrorCode));

export const isWaiting = (
  model: Model,
  maybeHeld: Option.Option<Held>
): boolean =>
  Option.contains(maybeHeld, "Loading") ||
  (!isBroken(model, maybeHeld) && model.isWaiting);

export const playButtonView = (
  model: Model,
  isDisabled: boolean,
  h: HtmlBuilder<Message>
): Html =>
  IconButton.view(
    model.isPlaying
      ? {
          glyph: "pause",
          label: "Pause",
          onClick: Message.ClickedPause(),
          isDisabled,
        }
      : {
          glyph: "play",
          label: "Play",
          onClick: Message.ClickedPlay(),
          isDisabled,
        },
    h
  );

export const muteButtonView = (
  model: Model,
  isDisabled: boolean,
  h: HtmlBuilder<Message>
): Html =>
  IconButton.view(
    {
      glyph: model.isMuted ? "volume-off" : "volume",
      label: "Mute",
      onClick: Message.ClickedMute(),
      isDisabled,
      attributes: [Button.pressedAttribute(model.isMuted, h)],
    },
    h
  );

export const retryActions = (
  hasRetry: boolean,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  hasRetry
    ? [
        Button.view(
          { label: "retry", isSmall: true, onClick: Message.ClickedRetry() },
          h
        ),
      ]
    : [];

const SEEK_CELLS = 24;

export const seekView = (
  model: Model,
  isNativeDisabled: boolean,
  h: HtmlBuilder<Message>
): Html => {
  const maybeKnownLength = Option.filter(
    model.maybeDuration,
    (duration) => duration > 0
  );

  const place = Option.match(maybeKnownLength, {
    onNone: () => 0,
    onSome: (duration) => Math.min(model.time, duration),
  });

  const lit = Option.match(maybeKnownLength, {
    onNone: () => 0,
    onSome: (duration) => Math.floor((place / duration) * SEEK_CELLS),
  });

  const isHeldUntilLengthKnown =
    !isNativeDisabled && Option.isNone(maybeKnownLength);

  return h.span(
    [h.Class("media-seek")],
    [
      h.span(
        [h.Class("cells"), h.AriaHidden(true)],
        Array.makeBy(SEEK_CELLS, (index) =>
          h.span([h.Class(index < lit ? "cell on" : "cell")])
        )
      ),
      UiInput.view(
        {
          id: `${model.id}-seek`,
          type: "range",
          value: `${place}`,
          isDisabled: isNativeDisabled,
          ...(isHeldUntilLengthKnown
            ? {}
            : {
                onInput: (value: string) =>
                  Message.UpdatedSeek({ to: globalThis.Number(value) }),
              }),
          toView: (groups) =>
            h.input([
              ...groups.input,
              ...(isHeldUntilLengthKnown ? [h.AriaDisabled(true)] : []),
              h.AriaLabel("Seek"),
              h.AriaValuetext(
                Option.match(model.maybeDuration, {
                  onNone: () => `${formatClock(model.time)}, length unknown`,
                  onSome: (duration) =>
                    `${formatClock(model.time)} of ${formatClock(duration)}`,
                })
              ),
              h.Min("0"),
              h.Max(`${Option.getOrElse(maybeKnownLength, () => 0)}`),
              h.Step("any"),
            ]),
        },
        h
      ),
    ]
  );
};

export const timeView = (
  model: Model,
  isTimeWaiting: boolean,
  h: HtmlBuilder<Message>
): Html =>
  h.span(
    [h.Class(isTimeWaiting ? "media-time waiting" : "media-time")],
    [
      h.span(
        [h.Role("status")],
        isTimeWaiting
          ? ["loading", h.span([h.Class("cursor"), h.AriaHidden(true)])]
          : []
      ),
      ...(isTimeWaiting
        ? []
        : [
            h.span(
              [h.AriaHidden(true)],
              [
                `${formatClock(model.time)} / ${Option.match(
                  model.maybeDuration,
                  {
                    onNone: () => UNKNOWN_CLOCK,
                    onSome: formatClock,
                  }
                )}`,
              ]
            ),
          ]),
    ]
  );
