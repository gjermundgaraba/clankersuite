import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Media from "../media/media.ts";
import * as VideoFrame from "./video-frame.ts";

const videoView =
  (inputs: Partial<VideoFrame.ViewInputs>) =>
  (model: Media.Model, h: HtmlBuilder<Media.Message>) =>
    VideoFrame.view(
      model,
      {
        src: "/cells.mp4",
        label: "Sample video",
        size: Media.FrameSize.Pixels({ width: 384, height: 216 }),
        poster: "/cells.png",
        captions: { src: "/cells.vtt", language: "en", label: "English" },
        caption: ["A field of cells."],
        credit: ["sample video"],
        ...inputs,
      },
      h
    );

const playing = Media.Message.UpdatedMediaState({
  reading: {
    isPlaying: true,
    time: 2,
    maybeDuration: Option.some(6),
    isMuted: false,
    maybeErrorCode: Option.none(),
  },
});

const mountPlayer = Scene.Mount.resolveAll(
  [Media.BindPlayerKeys, Media.Message.PressedSeekKey({ by: 0 })],
  [Media.ReadMedia, playing]
);

describe("VideoFrame", () => {
  it("is a group named by its label, keeping its ratio, with its caption", () => {
    Scene.scene(
      { update: Media.update, view: videoView({}) },
      Scene.given(Media.init({ id: "cells" })),
      mountPlayer,
      Scene.expect(Scene.role("group", { name: "Sample video" })).toHaveStyle(
        "--ratio",
        "384 / 216"
      ),
      Scene.expect(Scene.role("button", { name: "Pause" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Captions" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.expect(Scene.selector("track")).toHaveAttr("srclang", "en"),
      Scene.expect(Scene.selector("figcaption .meta")).toHaveText(
        "sample video"
      )
    );
  });

  it("presses the captions toggle", () => {
    Scene.scene(
      { update: Media.update, view: videoView({}) },
      Scene.given(Media.init({ id: "cells" })),
      mountPlayer,
      Scene.click(Scene.role("button", { name: "Captions" })),
      Scene.Command.resolve(
        Media.ShowCaptions,
        Media.Message.CompletedShowCaptions()
      ),
      Scene.expect(Scene.role("button", { name: "Captions" })).toHaveAttr(
        "aria-pressed",
        "true"
      )
    );
  });

  it("lays the loading line over the picture while held loading", () => {
    Scene.scene(
      { update: Media.update, view: videoView({ held: "Loading" }) },
      Scene.given(Media.init({ id: "cells" })),
      mountPlayer,
      Scene.expect(Scene.selector(".media-wait")).toContainText("loading"),
      Scene.expect(Scene.role("status")).toHaveText("loading")
    );
  });

  it("holds its controls and says why it cannot play once broken", () => {
    Scene.scene(
      { update: Media.update, view: videoView({ held: "Broken" }) },
      Scene.given(Media.init({ id: "cells" })),
      mountPlayer,
      Scene.expect(Scene.role("alert")).toContainText("cannot play this video"),
      Scene.expect(Scene.role("button", { name: "Pause" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "Mute" })).not.toHaveHandler(
        "click"
      ),
      Scene.expect(Scene.role("slider", { name: "Seek" })).toBeDisabled(),
      Scene.expect(Scene.role("slider", { name: "Seek" })).not.toHaveAttr(
        "aria-disabled"
      ),
      Scene.expect(Scene.role("button", { name: "retry" })).toBeAbsent()
    );
  });
});
