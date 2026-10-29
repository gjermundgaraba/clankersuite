import { Option } from "effect";
import type { Html } from "foldkit/html";
import { defineView } from "foldkit/submodel";

import * as Media from "../media/media.ts";
import * as Notice from "../notice/notice.ts";

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  src: string;
  /** What plays, in the sans: the strip's words and its name for screen readers. */
  label: string;
  /** Holds the strip loading or broken, whatever the audio does. */
  held?: Media.Held;
  /** Adds a retry button to the failed strip: it loads the source again and reports
   *  `Retried`. */
  hasRetry?: boolean;
}>;

/**
 * A native audio element as one compact strip in a 2px ink box, a group named by its label:
 * play, the label, the place as cells, the time and mute. Space or k plays and pauses, the
 * arrows seek five seconds. While it waits for data the time gives way to the loading word
 * and the working cursor; if it cannot play, the strip turns red and says why in an alert. It
 * sits at rest: no print shadow.
 */
export const view = defineView<Media.Model, Media.Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { src, label, hasRetry = false } = viewInputs;
    const maybeHeld = Option.fromNullishOr(viewInputs.held);
    const isBroken = Media.isBroken(model, maybeHeld);

    const brokenView = Notice.view(
      {
        tone: "Error",
        title: "cannot play this",
        body: [`${label}. ${Media.failureReason(model.maybeErrorCode)}`],
        actions: Media.retryActions(hasRetry, h),
      },
      h
    );

    const barView = h.div(
      [h.Class("media-bar")],
      [
        Media.playButtonView(model, false, h),
        h.span([h.Class("media-title")], [label]),
        Media.seekView(model, false, h),
        Media.timeView(model, Media.isWaiting(model, maybeHeld), h),
        Media.muteButtonView(model, false, h),
      ]
    );

    return h.div(
      [
        h.OnMount(Media.BindPlayerKeys()),
        h.Role("group"),
        h.AriaLabel(label),
        h.Class(isBroken ? "audio broken" : "audio"),
      ],
      [
        h.audio([
          h.Id(Media.id(model)),
          h.Src(src),
          h.Preload("metadata"),
          h.Muted(model.isMuted),
          h.OnMount(Media.ReadMedia()),
        ]),
        isBroken ? brokenView : barView,
      ]
    );
  }
);
