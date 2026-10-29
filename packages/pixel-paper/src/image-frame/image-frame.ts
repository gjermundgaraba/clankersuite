import { Effect } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import * as Button from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";
import * as Media from "../media/media.ts";
import * as Notice from "../notice/notice.ts";

/** The Message `DetectBrokenImage` reports before the view maps it to the caller's
 *  `onBroken`. */
export const Message = defineMessageUnion({
  CompletedDetectBrokenImage: {},
});

export type Message = typeof Message.Type;

/** Reports a picture that cannot load: one whose error comes after it mounts, and one that
 *  had already failed before the page's script ran, whose error event fired to nobody. */
export const DetectBrokenImage = Mount.define("DetectBrokenImage", {
  messages: [Message.CompletedDetectBrokenImage],
  execute: ({ element }) =>
    Effect.callback<typeof Message.CompletedDetectBrokenImage.Type>(
      (resume) => {
        const isAlreadyBroken =
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth === 0;

        if (isAlreadyBroken) {
          resume(Effect.succeed(Message.CompletedDetectBrokenImage()));

          return;
        }

        const onError = (): void => {
          resume(Effect.succeed(Message.CompletedDetectBrokenImage()));
        };

        element.addEventListener("error", onError, { once: true });

        return Effect.sync(() => {
          element.removeEventListener("error", onError);
        });
      }
    ),
});

const WAIT_GLYPH_SIZE = 24;

const HELD_CLASS: Record<Media.Held, string> = {
  Loading: "waiting",
  Broken: "broken",
};

/** Configuration for rendering an image frame with `view`. */
export type ViewConfig<Message> = Readonly<{
  src: string;
  /** What the picture shows, for a screen reader; also printed in the frame when it fails.
   *  Empty for a picture that only decorates. */
  alt: string;
  size: Media.FrameSize;
  /** Under the frame, in the sans: what it shows, in a sentence. */
  caption?: ReadonlyArray<Html | string>;
  /** At the caption's right, in the meta register: who made it, where it is from. */
  credit?: ReadonlyArray<Html | string>;
  /** Fetch at once: a picture in the first screen, which lazy loading would only hold back. */
  isEager?: boolean;
  /** What holds the picture back now, `undefined` once it shows: the application's Model
   *  decides on every render. `"Broken"` is for a specimen, a source the product already
   *  knows is gone, or one the caller has heard fail through `onBroken`. */
  held?: Media.Held | undefined;
  /** Sent when the picture cannot load (see `DetectBrokenImage`). Keep it in the Model and
   *  pass `held: "Broken"`. In a Scene, resolve the instance `DetectBrokenImage()` with this
   *  Message. */
  onBroken?: Message;
  /** Adds a retry button to the broken frame. Clear `held` when it arrives: the picture is
   *  asked for again by a new element. */
  onRetry?: Message;
}>;

/**
 * A picture in a 2px ink frame that keeps its space from the first paint, so nothing below
 * moves when it arrives. Under the picture the frame is head tint with the picture glyph, so
 * the picture paints over it whenever it comes, with or without script; once broken, the
 * frame turns red and says so in an alert with the alt text. It sits at rest, in a panel or in
 * prose: no print shadow. Lazy and decoded off the main thread unless `isEager`.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    src,
    alt,
    size,
    caption = [],
    credit = [],
    isEager = false,
    held,
    onBroken,
    onRetry,
  } = config;

  const isBroken = held === "Broken";

  const imageView = h.img([
    h.Src(src),
    h.Alt(alt),
    ...Media.sizeAttributes(size, h),
    h.Loading(isEager ? "eager" : "lazy"),
    h.Decoding("async"),
    ...(onBroken === undefined
      ? []
      : [h.OnMount(Mount.mapMessage(DetectBrokenImage(), () => onBroken))]),
  ]);

  const brokenView = h.div(
    [h.Class("media-broken")],
    [
      Notice.view(
        {
          tone: "Error",
          title: "image not found",
          body: [alt],
          actions:
            onRetry === undefined
              ? []
              : [
                  Button.view(
                    { label: "retry", isSmall: true, onClick: onRetry },
                    h
                  ),
                ],
        },
        h
      ),
    ]
  );

  return h.figure(
    [
      h.Style(Media.frameStyle(size)),
      h.Class(held === undefined ? "image" : `image ${HELD_CLASS[held]}`),
    ],
    [
      h.div(
        [h.Class("image-frame")],
        [
          h.span(
            [h.Class("image-wait"), h.AriaHidden(true)],
            [Glyph.view({ name: "image", size: WAIT_GLYPH_SIZE }, h)]
          ),
          ...(isBroken ? [brokenView] : [imageView]),
        ]
      ),
      ...Media.captionView(caption, credit, h),
    ]
  );
};
