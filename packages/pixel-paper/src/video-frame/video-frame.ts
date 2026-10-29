import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineView } from "foldkit/submodel";

import * as Button from "../button/button.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import * as Loading from "../loading/loading.ts";
import * as Media from "../media/media.ts";
import * as Notice from "../notice/notice.ts";

/** A WebVTT file of captions, shown while the captions toggle is pressed. */
export type Captions = Readonly<{
  src: string;
  language: string;
  label: string;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  src: string;
  /** Names the player for screen readers: what the video is. */
  label: string;
  size: Media.FrameSize;
  /** The still shown before it plays. */
  poster?: string;
  captions?: Captions;
  /** Under the frame, in the sans. Markup that carries no handlers: it is built in the
   *  application's boundary and rendered in this Submodel's. */
  caption?: ReadonlyArray<Html | string>;
  /** At the caption's right, in the meta register. Carries no handlers, as `caption`. */
  credit?: ReadonlyArray<Html | string>;
  /** Holds the frame loading or broken, whatever the video does. */
  held?: Media.Held;
  /** Adds a retry button to the failed frame: it loads the source again and reports
   *  `Retried`. */
  hasRetry?: boolean;
}>;

const videoView = (
  model: Media.Model,
  src: string,
  poster: string | undefined,
  captions: Captions | undefined,
  h: HtmlBuilder<Media.Message>
): Html =>
  h.video(
    [
      h.Id(Media.id(model)),
      h.Src(src),
      ...(poster === undefined ? [] : [h.Poster(poster)]),
      h.Preload("metadata"),
      h.Playsinline(true),
      h.Tabindex(-1),
      h.Muted(model.isMuted),
      h.OnClick(
        model.isPlaying
          ? Media.Message.ClickedPause()
          : Media.Message.ClickedPlay()
      ),
      h.OnMount(Media.ReadMedia()),
    ],
    captions === undefined
      ? []
      : [
          h.track([
            h.Attribute("kind", "captions"),
            h.Src(captions.src),
            h.Attribute("srclang", captions.language),
            h.LabelAttr(captions.label),
          ]),
        ]
  );

const brokenView = (
  model: Media.Model,
  hasRetry: boolean,
  h: HtmlBuilder<Media.Message>
): Html =>
  h.div(
    [h.Class("media-broken")],
    [
      Notice.view(
        {
          tone: "Error",
          title: "cannot play this video",
          body: [Media.failureReason(model.maybeErrorCode)],
          actions: Media.retryActions(hasRetry, h),
        },
        h
      ),
    ]
  );

const barView = (
  model: Media.Model,
  isBroken: boolean,
  captions: Captions | undefined,
  h: HtmlBuilder<Media.Message>
): Html =>
  h.div(
    [h.Class("media-bar")],
    [
      Media.playButtonView(model, isBroken, h),
      Media.seekView(model, isBroken, h),
      Media.timeView(model, false, h),
      Media.muteButtonView(model, isBroken, h),
      ...(captions === undefined
        ? []
        : [
            IconButton.view(
              {
                glyph: "captions",
                label: "Captions",
                onClick: Media.Message.ClickedCaptions(),
                isDisabled: isBroken,
                attributes: [
                  Button.pressedAttribute(model.isShowingCaptions, h),
                ],
              },
              h
            ),
          ]),
    ]
  );

/**
 * A native video in a 2px ink frame that keeps its ratio, over a bar of the system's own
 * controls, all in a group named by `label`: play, the place as cells, the time, mute and
 * captions. Space or k plays and pauses, the arrows seek five seconds; each control is named,
 * and its name is its tip, and the toggles say whether they are pressed. While it waits for
 * data the loading line sits over the picture; if it cannot play, the frame turns red and says
 * why in an alert, and its controls are held. It sits at rest: no print shadow.
 */
export const view = defineView<Media.Model, Media.Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      src,
      label,
      size,
      poster,
      captions,
      caption = [],
      credit = [],
      hasRetry = false,
    } = viewInputs;

    const maybeHeld = Option.fromNullishOr(viewInputs.held);
    const isBroken = Media.isBroken(model, maybeHeld);
    const isWaiting = Media.isWaiting(model, maybeHeld);

    return h.figure(
      [
        h.OnMount(Media.BindPlayerKeys()),
        h.Role("group"),
        h.AriaLabel(label),
        h.Style(Media.frameStyle(size)),
        h.Class(isBroken ? "video broken" : "video"),
      ],
      [
        h.div(
          [h.Class("media-box")],
          [
            h.div(
              [h.Class("media-screen")],
              [
                videoView(model, src, poster, captions, h),
                h.div(isWaiting ? [h.Class("media-wait")] : [], [
                  Loading.view({ isLoading: isWaiting }, h),
                ]),
                ...(isBroken ? [brokenView(model, hasRetry, h)] : []),
              ]
            ),
            barView(model, isBroken, captions, h),
          ]
        ),
        ...Media.captionView(caption, credit, h),
      ]
    );
  }
);
