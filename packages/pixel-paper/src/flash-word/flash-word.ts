import { Duration, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** How long a flash word stays before the caller takes it back. */
export const HOLD = Duration.millis(1800);

/** Configuration for rendering a flash word with `view`. */
export type ViewConfig = Readonly<{
  /** The word from the caller's Model (`"saved"`), or `None` once it is taken back. */
  maybeWord: Option.Option<string>;
}>;

/**
 * Where a word printed beside an action for a moment (`"copied"`, `"saved"`) goes. It is a
 * polite status, always on the page so the word is heard when it arrives; empty, it takes no
 * room. For the outcome of the control the reader just used, beside it: an outcome they may
 * not be looking at is a toast, and a state the whole interface is in is a Banner.
 *
 * The word and its clearing live in the caller's Model: set it to `Option.some(word)`
 * together with a Command that waits `HOLD` and reports back, and clear it when that Message
 * arrives, unless a newer word has replaced it since (keep a count, and drop a stale wait):
 *
 * ```ts
 * const WaitBeforeClearFlashWord = Command.define("WaitBeforeClearFlashWord", {
 *   args: { count: Schema.Finite },
 *   messages: [Message.CompletedWaitBeforeClearFlashWord],
 *   execute: ({ count }) =>
 *     Effect.sleep(FlashWord.HOLD).pipe(
 *       Effect.as(Message.CompletedWaitBeforeClearFlashWord({ count })),
 *     ),
 * });
 * ```
 */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { maybeWord } = config;

  return h.span(
    [h.Role("status"), h.Class("flash-word")],
    Option.toArray(maybeWord)
  );
};
