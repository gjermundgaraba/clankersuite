import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Media from "../media/media.ts";
import * as AudioFrame from "./audio-frame.ts";

const audioView =
  (inputs: Partial<AudioFrame.ViewInputs>) =>
  (model: Media.Model, h: HtmlBuilder<Media.Message>) =>
    AudioFrame.view(
      model,
      { src: "/tones.mp3", label: "Sample tones", ...inputs },
      h
    );

const mountPlayerAt = (maybeDuration: Option.Option<number>) =>
  Scene.Mount.resolveAll(
    [Media.BindPlayerKeys, Media.Message.PressedSeekKey({ by: 0 })],
    [
      Media.ReadMedia,
      Media.Message.UpdatedMediaState({
        reading: {
          isPlaying: false,
          time: 7,
          maybeDuration,
          isMuted: false,
          maybeErrorCode: Option.none(),
        },
      }),
    ]
  );

const mountPlayer = mountPlayerAt(Option.some(65));

const strip = Scene.role("group", { name: "Sample tones" });

const seek = Scene.role("slider", { name: "Seek" });

describe("AudioFrame", () => {
  it("is a group named by its title, with named controls and a named seek bar", () => {
    Scene.scene(
      { update: Media.update, view: audioView({}) },
      Scene.given(Media.init({ id: "tones" })),
      Scene.Mount.expectHas(Media.BindPlayerKeys, Media.ReadMedia),
      mountPlayer,
      Scene.expect(strip).toHaveClass("audio"),
      Scene.expect(Scene.role("button", { name: "Play" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Mute" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.expect(seek).toHaveAttr("aria-valuetext", "0:07 of 1:05"),
      Scene.expect(seek).toHaveHandler("input"),
      Scene.expect(Scene.selector(".media-time")).toHaveText("0:07 / 1:05"),
      Scene.expect(Scene.selector("audio")).toHaveAttr("id", "tones")
    );
  });

  it("holds its seek bar in the keyboard while the length is unknown", () => {
    Scene.scene(
      { update: Media.update, view: audioView({}) },
      Scene.given(Media.init({ id: "tones" })),
      mountPlayerAt(Option.none()),
      Scene.expect(seek).toHaveAttr("aria-disabled", "true"),
      Scene.expect(seek).not.toHaveAttr("disabled"),
      Scene.expect(seek).not.toHaveHandler("input"),
      Scene.expect(seek).toHaveAttr("aria-valuetext", "0:07, length unknown")
    );
  });

  it("presses mute and plays from its button", () => {
    Scene.scene(
      { update: Media.update, view: audioView({}) },
      Scene.given(Media.init({ id: "tones" })),
      mountPlayer,
      Scene.click(Scene.role("button", { name: "Mute" })),
      Scene.expect(Scene.role("button", { name: "Mute" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.click(Scene.role("button", { name: "Play" })),
      Scene.Command.resolve(Media.PlayMedia, Media.Message.CompletedPlayMedia())
    );
  });

  it("says it is loading while held so, as a status", () => {
    Scene.scene(
      { update: Media.update, view: audioView({ held: "Loading" }) },
      Scene.given(Media.init({ id: "tones" })),
      mountPlayer,
      Scene.expect(Scene.role("status")).toHaveText("loading")
    );
  });

  it("says why it cannot play in an alert, and retries", () => {
    Scene.scene(
      {
        update: Media.update,
        view: audioView({ held: "Broken", hasRetry: true }),
      },
      Scene.given(Media.init({ id: "tones" })),
      mountPlayer,
      Scene.expect(strip).toHaveClass("broken"),
      Scene.expect(Scene.role("alert")).toContainText("Sample tones."),
      Scene.expect(Scene.role("button", { name: "Play" })).toBeAbsent(),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.expectOutMessage(Media.OutMessage.Retried()),
      Scene.Command.resolve(
        Media.ReloadMedia,
        Media.Message.CompletedReloadMedia()
      )
    );
  });
});
