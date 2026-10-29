import { Effect, Fiber, Option, Stream } from "effect";
import { Story } from "foldkit";
import * as Mount from "foldkit/mount";
import { assert, describe, expect, it } from "vite-plus/test";

import { keydown, readDuringDispatch } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import * as Media from "./media.ts";
import type { Reading } from "./media.ts";

const reading = (overrides: Partial<Reading>): Reading => ({
  isPlaying: false,
  time: 0,
  maybeDuration: Option.some(60),
  isMuted: false,
  maybeErrorCode: Option.none(),
  ...overrides,
});

const loaded = Media.update(
  Media.init({ id: "tones" }),
  Media.Message.UpdatedMediaState({ reading: reading({ time: 10 }) })
).model;

describe("Media update", () => {
  it("plays and pauses the element, and follows what its events say", () => {
    Story.story(
      Media.update,
      Story.given(loaded),
      Story.message(Media.Message.ClickedPlay()),
      Story.Command.resolve(
        Media.PlayMedia,
        Media.Message.CompletedPlayMedia()
      ),
      Story.message(
        Media.Message.UpdatedMediaState({
          reading: reading({ isPlaying: true }),
        })
      ),
      Story.model((model) => {
        expect(model.isPlaying).toBe(true);
      }),
      Story.message(Media.Message.PressedPlaybackKey()),
      Story.Command.resolve(
        Media.PauseMedia,
        Media.Message.CompletedPauseMedia()
      )
    );
  });

  it("seeks by the keys within the length, and not before the length is known", () => {
    Story.story(
      Media.update,
      Story.given(loaded),
      Story.message(Media.Message.PressedSeekKey({ by: -Media.SEEK_STEP * 3 })),
      Story.Command.resolve(
        Media.SeekMedia({ mediaId: "tones", to: 0 }),
        Media.Message.CompletedSeekMedia()
      ),
      Story.model((model) => {
        expect(model.time).toBe(0);
      })
    );
    Story.story(
      Media.update,
      Story.given(Media.init({ id: "tones" })),
      Story.message(Media.Message.UpdatedSeek({ to: 30 })),
      Story.Command.expectNone()
    );
  });

  it("mutes in the Model, which the view writes to the element", () => {
    Story.story(
      Media.update,
      Story.given(loaded),
      Story.message(Media.Message.ClickedMute()),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.isMuted).toBe(true);
      })
    );
  });

  it("reloads on retry, forgets the failure, and reports Retried", () => {
    Story.story(
      Media.update,
      Story.given(
        Media.update(
          loaded,
          Media.Message.UpdatedMediaState({
            reading: reading({ maybeErrorCode: Option.some(4) }),
          })
        ).model
      ),
      Story.message(Media.Message.ClickedRetry()),
      Story.expectOutMessage(Media.OutMessage.Retried()),
      Story.Command.resolve(
        Media.ReloadMedia,
        Media.Message.CompletedReloadMedia()
      ),
      Story.model((model) => {
        expect(Option.isNone(model.maybeErrorCode)).toBe(true);
      })
    );
  });

  it("shows and hides the captions", () => {
    Story.story(
      Media.update,
      Story.given(loaded),
      Story.message(Media.Message.ClickedCaptions()),
      Story.Command.resolve(
        Media.ShowCaptions({ mediaId: "tones", isShowing: true }),
        Media.Message.CompletedShowCaptions()
      ),
      Story.model((model) => {
        expect(model.isShowingCaptions).toBe(true);
      })
    );
  });
});

describe("Media state", () => {
  it("is broken when held so, or failed while not held loading", () => {
    const failed = Media.update(
      loaded,
      Media.Message.UpdatedMediaState({
        reading: reading({ maybeErrorCode: Option.some(2) }),
      })
    ).model;

    expect(Media.isBroken(failed, Option.none())).toBe(true);
    expect(Media.isBroken(failed, Option.some("Loading"))).toBe(false);
    expect(Media.isBroken(loaded, Option.some("Broken"))).toBe(true);
    expect(Media.isWaiting(loaded, Option.some("Loading"))).toBe(true);
    expect(Media.failureReason(failed.maybeErrorCode)).toBe(
      "The connection dropped while it loaded."
    );
  });
});

const renderFrame = (): void => {
  document.body.innerHTML = `
    <div id="frame">
      <button id="play">play</button>
      <input id="seek" type="range" />
    </div>`;
};

const pressOn = (
  id: string,
  key: string,
  init: KeyboardEventInit = {},
  isHandled = false
) =>
  readDuringDispatch(byId(id), keydown(key, init), Media.playerKey, {
    isHandled,
  });

describe("Media keys", () => {
  it("plays on k anywhere and on Space off a button", () => {
    renderFrame();

    expect(pressOn("seek", " ")).toStrictEqual(
      Option.some(Media.Message.PressedPlaybackKey())
    );
    expect(Option.isNone(pressOn("play", " "))).toBe(true);
    expect(pressOn("play", "k")).toStrictEqual(
      Option.some(Media.Message.PressedPlaybackKey())
    );
  });

  it("seeks on the side arrows, and up and down only on the seek bar", () => {
    renderFrame();

    expect(pressOn("play", "ArrowRight")).toStrictEqual(
      Option.some(Media.Message.PressedSeekKey({ by: Media.SEEK_STEP }))
    );
    expect(Option.isNone(pressOn("play", "ArrowUp"))).toBe(true);
    expect(pressOn("seek", "ArrowDown")).toStrictEqual(
      Option.some(Media.Message.PressedSeekKey({ by: -Media.SEEK_STEP }))
    );
  });

  it("leaves modified, composing, handled and other keys alone", () => {
    renderFrame();

    expect(Option.isNone(pressOn("play", "k", { ctrlKey: true }))).toBe(true);
    expect(Option.isNone(pressOn("play", "k", { shiftKey: true }))).toBe(true);
    expect(Option.isNone(pressOn("play", "k", { isComposing: true }))).toBe(
      true
    );
    expect(Option.isNone(pressOn("play", "j"))).toBe(true);
    expect(Option.isNone(pressOn("play", "k", {}, true))).toBe(true);
  });

  it("takes no keys once the element has failed", () => {
    Story.story(
      Media.update,
      Story.given(
        Media.update(
          loaded,
          Media.Message.UpdatedMediaState({
            reading: reading({ maybeErrorCode: Option.some(4) }),
          })
        ).model
      ),
      Story.message(Media.Message.PressedPlaybackKey()),
      Story.message(Media.Message.PressedSeekKey({ by: Media.SEEK_STEP })),
      Story.Command.expectNone()
    );
  });
});

describe("ReadMedia", () => {
  it("reads the element once on mount and again on its events", async () => {
    document.body.innerHTML = `<audio id="tones"></audio>`;
    const audio = document.querySelector("#tones");

    assert(audio instanceof HTMLMediaElement, "The fixture has no audio.");

    const messages: Media.Message[] = [];

    const fiber = Effect.runFork(
      Media.ReadMedia()
        .f(audio, Mount.liveViewStateChanges)
        .pipe(
          Stream.take(3),
          Stream.runForEach((message) =>
            Effect.sync(() => messages.push(message))
          )
        )
    );

    await settleUntil(() => messages.length === 1);
    audio.dispatchEvent(new Event("waiting"));
    audio.dispatchEvent(new Event("playing"));
    await Effect.runPromise(Fiber.join(fiber));

    expect(messages.map(({ _tag }) => _tag)).toStrictEqual([
      "UpdatedMediaState",
      "UpdatedWaiting",
      "UpdatedWaiting",
    ]);
    expect(messages.at(0)).toStrictEqual(
      Media.Message.UpdatedMediaState({
        reading: {
          isPlaying: false,
          time: 0,
          maybeDuration: Option.none(),
          isMuted: false,
          maybeErrorCode: Option.none(),
        },
      })
    );
  });
});
