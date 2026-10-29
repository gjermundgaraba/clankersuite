import type { Html, HtmlBuilder } from "foldkit/html";

import * as Notice from "../notice/notice.ts";

/** Configuration for rendering a banner with `view`. */
export type ViewConfig = Readonly<{
  /** One sentence: the state, and what happens to the reader's work. */
  body: ReadonlyArray<Html | string>;
  /** `Error` (the default): red, a state that stops work (offline). `Warn`: amber, a state
   *  that is passing (reconnecting). `Ok`: ink, the state just ended (back online), shown
   *  briefly and then taken away. `Quiet`: tinted, news. */
  tone?: Notice.Tone;
  /** A control at the right: reconnect, reload. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** A printed slip fixed at the bottom centre, above the status bar: a state the whole
 *  interface is in (offline, reconnecting, read-only), for as long as it lasts. One at a
 *  time. It is not a live region, since it arrives already holding its sentence, which would
 *  go unheard: the application says the state once, when it begins, through the page's live
 *  region (the `Announcer.Announce` Command). An outcome that comes and goes is a
 *  toast; a word beside the control that did it is a FlashWord. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, tone = "Error", actions = [] } = config;

  return h.div(
    [h.Class("banner")],
    [Notice.toneGlyphView({ tone }, h), h.span([], body), ...actions]
  );
};
